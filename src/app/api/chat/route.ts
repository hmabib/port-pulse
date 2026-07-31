import { NextRequest } from "next/server";
import OpenAI from "openai";
import { query, queryWithClient, withClient } from "@/lib/db";
import {
  describeContext,
  describePeriodConstraint,
  type ChatContext,
} from "@/lib/chat-context";

export const runtime = "nodejs";

/* Routage GPT-5.6 par rôle : Luna absorbe la classification courte et
   fréquente ; Terra traite le SQL et l'analyse métier, où la fiabilité prime. */
const FAST_MODEL = "gpt-5.6-luna";
const ANALYSIS_MODEL = "gpt-5.6-terra";

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY manquant. Configurez la variable d'environnement avant d'utiliser le chat.");
  }
  return new OpenAI({ apiKey });
}

type ConversationTurn = { role: "user" | "assistant"; content: string };

/* ══════════════════════════════════════════════════════════════════
   RÈGLES MÉTIER DE LA BASE
   Ce bloc est le cœur de la fiabilité des réponses : il énonce les
   pièges de ce schéma, que le modèle ne peut pas deviner du schéma seul.
   ══════════════════════════════════════════════════════════════════ */

const DATA_SEMANTICS = `
PIÈGES DE CE SCHÉMA — À RESPECTER ABSOLUMENT

1. CUMUL MENSUEL (piège n°1)
   Dans kct.v_kct_daily et kct.kct_volumes_teu, les colonnes total_teu, import_teu,
   export_teu, transbo_teu et vides_teu sont des CUMULS MENSUELS qui repartent de
   zéro au premier bulletin de chaque mois.
   - Ne JAMAIS faire SUM(total_teu) sur plusieurs lignes : cela additionne des cumuls.
   - Ne JAMAIS faire AVG(total_teu) pour obtenir un « volume journalier moyen ».
   - Volume d'une JOURNÉE = différence entre le cumul du jour et celui du bulletin
     précédent DU MÊME MOIS. En SQL : total_teu - LAG(total_teu) OVER (
       PARTITION BY date_trunc('month', date_rapport) ORDER BY date_rapport).
   - Volume d'un MOIS = MAX(total_teu) sur le mois, jamais SUM.
   - Volume d'une ANNÉE = somme des MAX mensuels.

2. BULLETINS DUPLIQUÉS
   Une même date_rapport porte parfois plusieurs lignes (jusqu'à cinq observées).
   Pour un état journalier, dédupliquer : SELECT DISTINCT ON (date_rapport) ...
   ORDER BY date_rapport DESC. Sinon les comptages et moyennes sont surévalués.

3. COUVERTURE INCOMPLÈTE
   Environ un tiers des jours calendaires n'ont pas de bulletin, et les lundis sont
   les plus souvent manquants. Toute moyenne « par jour » doit être présentée comme
   portant sur les jours renseignés, et le nombre de jours doit être mentionné.
   Ne jamais diviser un total par le nombre de jours du calendrier.

4. TAUX D'OCCUPATION SUPÉRIEURS À 100 %
   taux_occupation_parc et taux_occupation_reefers peuvent légitimement dépasser
   100 %. Ce sont des faits réels (gerbage au-delà de la capacité nominale, prises
   temporaires). Ne JAMAIS les filtrer, les borner, ni les qualifier d'erreurs.
   Au-delà de 100 %, il s'agit d'une tension d'exploitation à commenter comme telle.

5. HORODATAGES NAVIRES EN TEXTE
   atb, atc, atd, eta, etc sont du texte au format « JJ/MM HH:MM », SANS ANNÉE, et
   souvent altérés par l'OCR. Ne JAMAIS calculer une durée d'escale directement en
   SQL sur ces colonnes : le résultat serait faux. Pour les durées de cycle navire,
   renvoyer l'utilisateur vers la vue Opérations navires, qui applique la
   reconstruction d'année. La colonne loa est également du texte (« 400M »).

6. PRODUCTIVITÉ
   net_prod et kpi_net_prod_* sont en mvt/h, jamais en pourcentage.
   Productivité nette = mouvements totaux (T. Units) / temps opérationnel réel.
   net_prod_moy_appareilles ne concerne que les navires appareillés ;
   net_prod_moy_operation que les navires en opération. Ne pas confondre.
   La base ne fournit pas le nombre de grues : ne jamais déduire une productivité
   par grue.

7. SNAPSHOTS
   kct_navires_attendus, kct_navires_operation et kct_operations_escales rejouent
   les mêmes navires sur plusieurs bulletins consécutifs. Pour compter des navires
   distincts, dédupliquer sur (nom_navire, voyage), jamais COUNT(*).
`;

const DOMAIN_GUIDE = `
CARTE DES SOURCES
- Pilotage du jour : kct.v_kct_daily, kct.kct_rapport_quotidien, kct.kct_kpis,
  kct.kct_gate_ttt, kct.kct_parc_conteneurs.
- Performance / cumul : kct.v_kct_monthly, kct.v_kct_weekly, kct.v_kct_daily.
- Opérations navires : kct.kct_navires_operation, kct.kct_navires_attendus,
  kct.kct_navires_appareilles, kct.v_navires_performance.
- Flotte & parc : kct.kct_parc_conteneurs, kct.kct_exploitants_parc.
- Escales : kct.kct_escales_armateurs, kct.kct_operations_escales.
- Trafic & EVP : kct.kct_volumes_teu.
- Gate & camions : kct.kct_gate_ttt (gate_total_mouvements, gate_total_entrees,
  gate_total_sorties, ttt_duree_minutes, ttt_total_camions).

UNITÉS
- Productivité : mvt/h. Volumes : TEU (ou EVP). Taux : %. TTT et délais : minutes.
- Gate : camions, conteneurs, mouvements. Escales : nombre.
`;

/* ────────── Cache du schéma ────────── */

let schemaCache: { text: string; expires: number } | null = null;

async function getSchema(): Promise<string> {
  if (schemaCache && Date.now() < schemaCache.expires) return schemaCache.text;

  const result = await query<{ table_name: string; column_name: string; data_type: string }>(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'kct'
    ORDER BY table_name, ordinal_position
  `);

  const tables = new Map<string, string[]>();
  for (const row of result.rows) {
    if (!tables.has(row.table_name)) tables.set(row.table_name, []);
    tables.get(row.table_name)!.push(`  ${row.column_name} (${row.data_type})`);
  }

  const text = Array.from(tables.entries())
    .map(([name, cols]) => `TABLE kct.${name}:\n${cols.join("\n")}`)
    .join("\n\n");

  schemaCache = { text, expires: Date.now() + 3_600_000 };
  return text;
}

/* ────────── Validation SQL ────────── */

function validateSQL(sql: string): { valid: boolean; error?: string } {
  const trimmed = sql.trim();
  const upper = trimmed.toUpperCase();

  if (!upper.startsWith("SELECT") && !upper.startsWith("WITH")) {
    return { valid: false, error: "Seules les requêtes de lecture sont autorisées." };
  }

  const blocked = [
    /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|EXECUTE)\b/i,
    /\b(INTO\s+OUTFILE|INTO\s+DUMPFILE)\b/i,
    /\b(PG_SLEEP|PG_READ_FILE|PG_WRITE_FILE|LO_IMPORT|LO_EXPORT)\b/i,
    /\bCOPY\b/i,
    /;\s*\S/,
  ];

  for (const pattern of blocked) {
    if (pattern.test(trimmed)) {
      return { valid: false, error: "Requête bloquée : instruction non autorisée." };
    }
  }

  return { valid: true };
}

function ensureLimit(sql: string, max = 200): string {
  if (/\bLIMIT\b/i.test(sql)) return sql;
  return `${sql.replace(/;?\s*$/, "")} LIMIT ${max}`;
}

function stripMarkdown(sql: string): string {
  return sql
    .trim()
    .replace(/^```sql?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
}

function normalizeGeneratedSql(sql: string): string {
  return sql
    .replace(
      /date_trunc\(\s*'([^']+)'\s*,\s*'(\d{4}-\d{2}-\d{2})'\s*\)/gi,
      "date_trunc('$1', DATE '$2')",
    )
    .replace(
      /date_trunc\(\s*'([^']+)'\s*,\s*'(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?)'\s*\)/gi,
      "date_trunc('$1', TIMESTAMP '$2')",
    );
}

/* ────────── Contexte conversationnel ────────── */

function buildConversationContext(turns: ConversationTurn[]): string {
  if (!turns.length) return "Aucun historique.";
  return turns
    .slice(-8)
    .map((turn, index) => {
      const clean = turn.content.replace(/\s+/g, " ").trim().slice(0, 700);
      return `${index + 1}. ${turn.role === "user" ? "Utilisateur" : "Assistant"}: ${clean}`;
    })
    .join("\n");
}

function normalizeSessionSummary(summary: unknown): string {
  if (typeof summary !== "string") return "";
  return summary.replace(/\s+/g, " ").trim().slice(0, 2500);
}

function getCurrentDateContext() {
  const now = new Date();
  return {
    isoDate: now.toISOString().slice(0, 10),
    frDate: new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "full",
      timeZone: "Africa/Douala",
    }).format(now),
  };
}

/* ────────── Classification d'intention ──────────
   Remplace l'heuristique par mots-clés, qui envoyait « Comment lire le TTT ? »
   vers le générateur SQL parce que la question contenait « ttt », et traitait
   « Merci, et pour avril ? » comme du bavardage, perdant le fil.              */

type Intent = "DONNEES" | "DEFINITION" | "NAVIGATION" | "SUIVI";

interface Classification {
  intent: Intent;
  /** Question rendue autonome, références résolues depuis l'historique et le contexte. */
  questionAutonome: string;
}

async function classify(
  openai: OpenAI,
  question: string,
  memoryContext: string,
  context: ChatContext | null,
): Promise<Classification> {
  try {
    const response = await openai.chat.completions.create({
      model: FAST_MODEL,
      reasoning_effort: "none",
      temperature: 0,
      max_completion_tokens: 300,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Tu classes les questions posées au cockpit portuaire Port Pulse.

Réponds en JSON strict : {"intent": "...", "questionAutonome": "..."}

INTENTS :
- "DONNEES"    : demande un chiffre, une liste, une comparaison, une tendance calculés sur les données.
- "DEFINITION" : demande ce que signifie un indicateur, comment il se calcule, comment le lire.
- "NAVIGATION" : demande où trouver une information, comment utiliser l'application.
- "SUIVI"      : question elliptique qui prolonge l'échange précédent ("et pour avril ?",
                 "et la productivité ?", "pourquoi ?"). Résous-la en question autonome.

RÈGLES :
- Une question de suivi qui demande un chiffre doit produire l'intent "DONNEES" une fois
  reformulée en question autonome, en héritant de la période et des filtres du contexte.
- "questionAutonome" doit être compréhensible seule, sans l'historique.
- Une simple politesse ("merci", "bonjour") suivie d'une vraie question porte sur la question.
- Corrige les fautes de frappe et abréviations : "escal" → escales, "navr" → navires, "evp" → TEU.

CONTEXTE ACTUEL :
${describeContext(context)}`,
        },
        { role: "user", content: `${memoryContext}\n\nQuestion : ${question}` },
      ],
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content ?? "{}");
    const intent: Intent = ["DONNEES", "DEFINITION", "NAVIGATION", "SUIVI"].includes(parsed.intent)
      ? parsed.intent
      : "DONNEES";

    return {
      intent: intent === "SUIVI" ? "DONNEES" : intent,
      questionAutonome:
        typeof parsed.questionAutonome === "string" && parsed.questionAutonome.trim()
          ? parsed.questionAutonome.trim()
          : question,
    };
  } catch {
    // En cas d'échec de classification, on privilégie la voie données :
    // mieux vaut un chiffre étayé qu'une réponse générique.
    return { intent: "DONNEES", questionAutonome: question };
  }
}

/* ────────── Génération SQL ────────── */

async function generateSql(
  openai: OpenAI,
  question: string,
  memoryContext: string,
  schema: string,
  context: ChatContext | null,
  isoDate: string,
  previousAttempt?: { sql: string; error: string },
): Promise<string> {
  const correction = previousAttempt
    ? `

TENTATIVE PRÉCÉDENTE REJETÉE PAR POSTGRESQL :
SQL : ${previousAttempt.sql}
Erreur : ${previousAttempt.error}
Corrige la requête. Vérifie les noms de colonnes dans le schéma ci-dessus, les types
et les agrégations. Ne répète pas la même erreur.`
    : "";

  const response = await openai.chat.completions.create({
    model: ANALYSIS_MODEL,
    reasoning_effort: "none",
    temperature: 0,
    max_completion_tokens: 900,
    messages: [
      {
        role: "system",
        content: `Tu es expert PostgreSQL pour le terminal à conteneurs KCT.
Tu traduis une question en français en une requête PostgreSQL valide.

RÈGLES DE FORME :
1. UNIQUEMENT un SELECT ou WITH ... SELECT. Jamais d'écriture.
2. Jamais de fonction système (pg_sleep, pg_read_file, lo_import…).
3. Toujours un LIMIT (200 maximum).
4. Uniquement les tables et colonnes du schéma fourni, préfixées par kct.
5. Retourne UNIQUEMENT le SQL brut : pas de markdown, pas de backticks, pas de commentaire.
6. Comparaisons de texte : ILIKE.
7. Date fixe : DATE 'AAAA-MM-JJ'. Horodatage fixe : TIMESTAMP 'AAAA-MM-JJ HH:MM:SS'.
   Exemple correct : date_trunc('month', DATE '${isoDate}'). Interdit : date_trunc('month', '${isoDate}').
8. Date du jour : ${isoDate}. Si aucune ligne n'existe à cette date, ancre-toi sur la
   date_rapport la plus récente disponible plutôt que sur CURRENT_DATE.
9. Nomme tes colonnes de sortie en français lisible (AS "Volume du jour").

${DATA_SEMANTICS}

${DOMAIN_GUIDE}

CONTEXTE DE L'UTILISATEUR :
${describeContext(context)}
${describePeriodConstraint(context)}

SCHÉMA :
${schema}

EXEMPLES :
Q: "Quel volume avons-nous fait hier ?"
SQL: WITH d AS (SELECT DISTINCT ON (date_rapport) date_rapport, total_teu FROM kct.v_kct_daily ORDER BY date_rapport DESC) SELECT date_rapport AS "Date", total_teu - LAG(total_teu) OVER (PARTITION BY date_trunc('month', date_rapport) ORDER BY date_rapport) AS "Volume du jour (TEU)" FROM d ORDER BY date_rapport DESC LIMIT 5

Q: "Quel est le volume total de mars 2026 ?"
SQL: SELECT MAX(total_teu) AS "Volume du mois (TEU)" FROM kct.v_kct_daily WHERE date_rapport >= DATE '2026-03-01' AND date_rapport < DATE '2026-04-01' LIMIT 1

Q: "Combien de navires distincts sont attendus cette semaine ?"
SQL: SELECT COUNT(DISTINCT (nom_navire, voyage)) AS "Navires attendus" FROM kct.kct_navires_attendus WHERE date_rapport >= DATE '${isoDate}' - interval '7 days' LIMIT 1${correction}`,
      },
      { role: "user", content: `${memoryContext}\n\nQuestion : ${question}` },
    ],
  });

  return stripMarkdown(response.choices[0]?.message?.content ?? "");
}

/* ────────── Exécution avec auto-correction ────────── */

interface ExecutionOutcome {
  rows: Record<string, unknown>[];
  rowCount: number;
  sql: string;
  attempts: number;
  error?: string;
}

async function runSql(sql: string): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> {
  return withClient(async (client) => {
    await queryWithClient(client, "SET statement_timeout = 15000");
    const res = await queryWithClient<Record<string, unknown>>(client, sql);
    return { rows: res.rows, rowCount: res.rowCount ?? 0 };
  });
}

async function executeWithRepair(
  openai: OpenAI,
  firstSql: string,
  question: string,
  memoryContext: string,
  schema: string,
  context: ChatContext | null,
  isoDate: string,
): Promise<ExecutionOutcome> {
  const validation = validateSQL(firstSql);
  if (!validation.valid) {
    return { rows: [], rowCount: 0, sql: firstSql, attempts: 1, error: validation.error };
  }

  const safeSql = ensureLimit(normalizeGeneratedSql(firstSql));

  try {
    const result = await runSql(safeSql);
    return { ...result, sql: safeSql, attempts: 1 };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("SQL rejeté (tentative 1):", message, "|", safeSql);

    // Auto-correction : l'erreur PostgreSQL est renvoyée au modèle plutôt
    // qu'affichée brute à l'utilisateur.
    try {
      const repaired = await generateSql(openai, question, memoryContext, schema, context, isoDate, {
        sql: safeSql,
        error: message,
      });

      const repairedValidation = validateSQL(repaired);
      if (!repairedValidation.valid) {
        return { rows: [], rowCount: 0, sql: safeSql, attempts: 2, error: message };
      }

      const repairedSafe = ensureLimit(normalizeGeneratedSql(repaired));
      const result = await runSql(repairedSafe);
      return { ...result, sql: repairedSafe, attempts: 2 };
    } catch (retryErr: unknown) {
      const retryMessage = retryErr instanceof Error ? retryErr.message : String(retryErr);
      console.error("SQL rejeté (tentative 2):", retryMessage);
      return { rows: [], rowCount: 0, sql: safeSql, attempts: 2, error: retryMessage };
    }
  }
}

/* ────────── Traçabilité ────────── */

function extractSources(sql: string): string[] {
  const matches = sql.matchAll(/\bkct\.([a-z_0-9]+)/gi);
  return Array.from(new Set(Array.from(matches, (m) => m[1])));
}

function buildProvenance(outcome: ExecutionOutcome, context: ChatContext | null) {
  return {
    sources: extractSources(outcome.sql),
    periode: context?.periode.label ?? "Périmètre complet",
    lignes: outcome.rowCount,
    tentatives: outcome.attempts,
    couverture:
      context && context.qualite.joursManquants > 0
        ? `${context.qualite.bulletinsExploites} bulletins, ${context.qualite.joursManquants} jours sans relevé`
        : null,
  };
}

function formatFallbackAnswer(rows: Record<string, unknown>[], rowCount: number): string {
  if (rowCount === 0) {
    return "Aucun résultat pour cette question. Essayez de préciser la période ou le type de donnée recherché.";
  }
  if (rowCount === 1) {
    const entries = Object.entries(rows[0] ?? {});
    if (entries.length === 1) {
      const [, value] = entries[0];
      return `Résultat : ${value == null ? "aucune valeur" : String(value)}.`;
    }
  }
  const preview = rows
    .slice(0, 3)
    .map((row) =>
      Object.entries(row)
        .slice(0, 4)
        .map(([key, value]) => `${key} : ${value == null ? "—" : String(value)}`)
        .join(" | "),
    )
    .join("\n");
  return `${rowCount} résultat${rowCount > 1 ? "s" : ""}.\n${preview}`;
}

/* ══════════════════════════════════════════════════════════════════
   POST
   ══════════════════════════════════════════════════════════════════ */

export async function POST(req: NextRequest) {
  try {
    const openai = getOpenAIClient();
    const body = await req.json();
    const question: string = body?.question;
    const context: ChatContext | null = body?.context ?? null;
    const sessionSummary = normalizeSessionSummary(body?.sessionSummary);
    const conversation: ConversationTurn[] = Array.isArray(body?.conversation)
      ? body.conversation.filter(
          (turn: unknown): turn is ConversationTurn =>
            typeof turn === "object" &&
            turn !== null &&
            ((turn as ConversationTurn).role === "user" || (turn as ConversationTurn).role === "assistant") &&
            typeof (turn as ConversationTurn).content === "string",
        )
      : [];

    if (!question || typeof question !== "string" || !question.trim()) {
      return Response.json({ error: "Question manquante." }, { status: 400 });
    }
    if (question.length > 1000) {
      return Response.json({ error: "Question trop longue (1000 caractères maximum)." }, { status: 400 });
    }

    const conversationContext = buildConversationContext(conversation);
    const memoryContext = sessionSummary
      ? `Résumé de session :\n${sessionSummary}\n\nHistorique récent :\n${conversationContext}`
      : `Historique récent :\n${conversationContext}`;
    const currentDate = getCurrentDateContext();

    /* ── 1. Intention ── */
    const { intent, questionAutonome } = await classify(openai, question, memoryContext, context);

    /* ── 2. Questions non calculatoires ── */
    if (intent === "DEFINITION" || intent === "NAVIGATION") {
      const response = await openai.chat.completions.create({
        model: ANALYSIS_MODEL,
        reasoning_effort: "none",
        temperature: 0.3,
        max_completion_tokens: 900,
        messages: [
          {
            role: "system",
            content: `Tu es Port Pulse IA, assistant de pilotage d'un terminal à conteneurs.
Tu expliques les indicateurs, leur mode de calcul et l'usage du cockpit.

RÈGLES :
- Réponds en français, en markdown simple.
- Ne mentionne ni SQL, ni schéma technique, ni infrastructure.
- Ne fabrique aucun chiffre : si la question appelle une valeur, invite à la demander explicitement.
- Oriente vers la vue pertinente du cockpit.
- Rappels métier : la productivité nette s'exprime en mvt/h et jamais en pourcentage ;
  les volumes quotidiens de la base sont des cumuls mensuels ; les taux d'occupation
  peuvent légitimement dépasser 100 %.
- Date du jour : ${currentDate.frDate}.

CONTEXTE :
${describeContext(context)}`,
          },
          { role: "user", content: `${memoryContext}\n\nQuestion :\n${questionAutonome}` },
        ],
      });

      return Response.json({
        answer:
          response.choices[0]?.message?.content ??
          "Je peux vous aider à naviguer dans Port Pulse et à interpréter les indicateurs.",
        sql: null,
        rows: [],
        rowCount: 0,
        intent,
        provenance: null,
      });
    }

    /* ── 3. Voie données ── */
    const schema = await getSchema();
    const generatedSql = await generateSql(
      openai,
      questionAutonome,
      memoryContext,
      schema,
      context,
      currentDate.isoDate,
    );

    const outcome = await executeWithRepair(
      openai,
      generatedSql,
      questionAutonome,
      memoryContext,
      schema,
      context,
      currentDate.isoDate,
    );

    if (outcome.error && outcome.rowCount === 0 && outcome.rows.length === 0) {
      return Response.json({
        answer:
          "Je n'ai pas réussi à construire une requête exploitable pour cette question, même après correction. " +
          "Pouvez-vous la reformuler en précisant la période et l'indicateur souhaité ?",
        sql: outcome.sql,
        rows: [],
        rowCount: 0,
        intent,
        provenance: buildProvenance(outcome, context),
      });
    }

    /* ── 4. Interprétation ── */
    const truncatedRows = outcome.rows.length > 50 ? outcome.rows.slice(0, 50) : outcome.rows;

    let answer = "";
    try {
      const interpretation = await openai.chat.completions.create({
        model: ANALYSIS_MODEL,
        reasoning_effort: "none",
        temperature: 0.3,
        max_completion_tokens: 1500,
        messages: [
          {
            role: "system",
            content: `Tu es analyste d'exploitation pour un terminal à conteneurs.
Une requête a été exécutée sur les données, tu en restitues la lecture métier.

STRUCTURE :
- Commence par une réponse naturelle et directe, 2 à 5 phrases, en langage courant.
- Ajoute ensuite une section intitulée exactement : "## Détail structuré".
- Dans cette section : "Lecture rapide", "Points clés", "Point d'attention",
  "Suite recommandée" selon ce qui est utile.

RÈGLES :
- Français, markdown propre, séparateurs de milliers, dates lisibles ("5 avril 2026").
- Ne mentionne JAMAIS le SQL, la base, ni les noms techniques de colonnes.
- Tout chiffre cité doit provenir des résultats fournis. N'extrapole jamais.
- Si les résultats sont vides, dis-le et propose une reformulation.
- Les volumes quotidiens de la base sont des cumuls mensuels : ne somme pas des
  lignes successives, privilégie la dernière valeur et la progression.
- La productivité est en mvt/h, jamais en pourcentage.
- net_prod_moy_appareilles ne concerne que les navires appareillés,
  net_prod_moy_operation que les navires en opération.
- Un taux d'occupation supérieur à 100 % est un fait réel : commente-le comme une
  tension d'exploitation, jamais comme une erreur de donnée.
- Si la couverture du périmètre est partielle, signale-le en une phrase.
- Termine par une remarque analytique utile quand c'est pertinent.

CONTEXTE :
${describeContext(context)}`,
          },
          {
            role: "user",
            content: `${memoryContext}

Question : "${questionAutonome}"

Nombre de résultats : ${outcome.rowCount}
Résultats (JSON) :
${JSON.stringify(truncatedRows, null, 2)}${
              outcome.rows.length > 50
                ? `\n\n(... ${outcome.rows.length - 50} lignes supplémentaires tronquées)`
                : ""
            }`,
          },
        ],
      });

      answer =
        interpretation.choices[0]?.message?.content ??
        formatFallbackAnswer(outcome.rows, outcome.rowCount);
    } catch (err: unknown) {
      console.error("Erreur d'interprétation:", err instanceof Error ? err.message : String(err));
      answer = formatFallbackAnswer(outcome.rows, outcome.rowCount);
    }

    return Response.json({
      answer,
      sql: outcome.sql,
      rows: outcome.rows,
      rowCount: outcome.rowCount,
      intent,
      provenance: buildProvenance(outcome, context),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Erreur API chat:", message);
    return Response.json({ error: "Erreur interne du serveur.", detail: message }, { status: 500 });
  }
}
