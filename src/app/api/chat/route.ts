import { NextRequest } from "next/server";
import OpenAI from "openai";
import { query, queryWithClient, withClient } from "@/lib/db";

/* ────────────── Config ────────────── */

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY manquant. Configurez la variable d'environnement avant d'utiliser le chat.");
  }
  return new OpenAI({ apiKey });
}

export const runtime = "nodejs";

type ConversationTurn = {
  role: "user" | "assistant";
  content: string;
};

const DATA_KEYWORDS = [
  "navire",
  "escale",
  "teu",
  "evp",
  "kpi",
  "parc",
  "camion",
  "gate",
  "rapport",
  "bulletin",
  "volume",
  "trafic",
  "ligne",
  "stock",
  "occupation",
  "cumul",
  "mois",
  "annee",
  "jour",
  "attendu",
  "appareille",
  "operation",
  "correlation",
  "performance",
  "forecast",
  "budget",
  "flotte",
];

const GENERAL_KEYWORDS = [
  "bonjour",
  "salut",
  "hello",
  "merci",
  "aide",
  "comment",
  "pourquoi",
  "qui es tu",
  "que peux tu faire",
  "c'est quoi",
  "explique",
  "fonctionne",
];

const DOMAIN_GUIDE = `
CADRAGE METIER PORT PULSE
- Pilotage du jour: prioriser kct.v_kct_daily, kct.kct_rapport_quotidien, kct.kct_kpis, kct.kct_gate_ttt, kct.kct_parc_conteneurs.
- Cumul annuel: prioriser kct.v_kct_monthly, kct.v_kct_weekly, kct.v_kct_daily.
- Operations navires: prioriser kct.kct_navires_operation, kct.kct_navires_attendus, kct.kct_navires_appareilles, kct.v_navires_performance.
- Bulletins mensuels: prioriser kct.v_kct_monthly et les aggregations mensuelles sur date_rapport.
- Flotte & parc: prioriser kct.kct_parc_conteneurs, kct.kct_exploitants_parc.
- Analyses KPIs: prioriser kct.kct_kpis, kct.v_kct_daily, kct.v_kct_monthly.
- Correlations: comparer TEU, occupation parc, gate, TTT, productivite, escales.
- Aide a la decision: preferer syntheses recentes, evolutions, ecarts vs forecast et alertes de capacite.
- Vue source globale: preferer les vues kct.v_kct_daily, kct.v_kct_weekly, kct.v_kct_monthly si la question est synthese.
- Trafic & EVP: prioriser kct.kct_volumes_teu, notamment import_teu, export_teu, transbo_teu, total_teu, total_forecast.
- Gate & camions: prioriser kct.kct_gate_ttt, notamment gate_total_mouvements, gate_total_entrees, gate_total_sorties, ttt_duree_minutes.
- Escales lignes: prioriser kct.kct_escales_armateurs et kct.kct_operations_escales.
- Stock par ligne: prioriser kct.kct_exploitants_parc.
- KPIs terminal: prioriser kct.kct_kpis.
- Navires attendus: prioriser kct.kct_navires_attendus.
- Navires appareilles: prioriser kct.kct_navires_appareilles.
- Navires en operation: prioriser kct.kct_navires_operation.
- Flux par escale: prioriser kct.kct_operations_escales.
- Capacite parc: prioriser kct.kct_parc_conteneurs.
- Rapports source: prioriser kct.kct_rapport_quotidien.

FORMULES ET LECTURES A RESPECTER
- Le volume du jour se lit surtout via total_teu, avec le detail import_teu, export_teu, transbo_teu et vides_teu.
- La realisation budgetaire se lit via taux_realisation_total_pct et les ecarts versus total_forecast.
- La capacite parc se lit via parc_conteneurs_utilise, parc_conteneurs_disponible, parc_conteneurs_total, taux_occupation_parc.
- La pression reefers se lit via reefers_utilises, reefers_disponibles, reefers_total, taux_occupation_reefers.
- Le gate se lit via gate_total_mouvements, gate_total_entrees, gate_total_sorties, gate_entrees_pleins, gate_sorties_pleins.
- Le TTT se lit via ttt_duree_minutes, ttt_total_camions, ttt_total_conteneurs.
- Les navires se lisent par statut attendu, en operation, appareille.
- Pour les tendances, toujours ordonner par date_rapport ASC ou DESC selon le besoin analytique.
- Quand l'utilisateur dit "dernier", "recent", "aujourd'hui", "ce mois", "annee", ancrer sur la date_rapport la plus recente disponible si CURRENT_DATE risque d'etre vide.
- Corriger mentalement les fautes de frappe, abreviations et formulations approximatives: "escal" => "escales", "navr" => "navires", "evp" => "teu".
- net_prod_moy_appareilles concerne uniquement les navires appareilles, pas les navires en operation.
- net_prod_moy_operation concerne les navires en operation.
- La productivite nette n'est jamais un pourcentage.
- La productivite nette s'exprime en mvt/h.
- Lecture metier: productivite nette = nombre total de mouvements (T. Units) / temps operationnel reel en heures.
- Ne pas assimiler automatiquement le temps operationnel reel a ATB-ATD si la donnee metier fournie distingue explicitement le working time.
- Si plusieurs grues sont impliquees, une variante peut exister par grue, mais ne l'invente pas si la base ne la fournit pas.

UNITES DE MESURE A RESPECTER
- Productivite: mvt/h.
- Volumes conteneurs: TEU ou EVP selon la formulation utilisateur, mais conserver la coherence dans la reponse.
- Taux et occupation: %.
- TTT et delais: minutes, sauf si l'utilisateur demande explicitement heures.
- Gate: camions, conteneurs, mouvements.
- Escales et navires: nombre d'escales, nombre de navires.

LOGIQUE PLATEFORME ET INTERPRETATION
- Port Pulse comporte des vues de pilotage, cumul, operations navires, bulletins mensuels, flotte & parc, analyses KPIs, correlations, aide a la decision, vues source detaillees et chat.
- Si la question est exploratoire, guide l'utilisateur vers la bonne vue metier en t'appuyant sur les donnees disponibles.
- Si la question est decisionnelle, explique le lien entre symptome, cause probable et indicateur a surveiller.
- Les correlations servent a expliquer une relation entre pression parc, gate, TTT, volumes, escales et productivite, pas a affirmer une causalite sans nuance.
- Quand la logique metier le permet, privilegie une lecture de progression: situation recente, evolution sur la periode, ecart, implication.
- Si la table ressemble a un etat journalier ou a un snapshot mensuel, traite-la comme une photographie progressive et non comme un flux a sommer ligne par ligne.
`;

/* ────────── Schema cache ────────── */

let schemaCache: { text: string; expires: number } | null = null;

async function getSchema(): Promise<string> {
  if (schemaCache && Date.now() < schemaCache.expires) {
    return schemaCache.text;
  }

  const result = await query<{
    table_name: string;
    column_name: string;
    data_type: string;
  }>(`
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

/* ────────── SQL Validation ────────── */

function validateSQL(sql: string): { valid: boolean; error?: string } {
  const trimmed = sql.trim();
  const upper = trimmed.toUpperCase();

  // Must start with SELECT or WITH
  if (!upper.startsWith("SELECT") && !upper.startsWith("WITH")) {
    return { valid: false, error: "Seules les requetes SELECT sont autorisees." };
  }

  // Block dangerous keywords
  const blocked = [
    /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|EXECUTE)\b/i,
    /\b(INTO\s+OUTFILE|INTO\s+DUMPFILE)\b/i,
    /\b(PG_SLEEP|PG_READ_FILE|PG_WRITE_FILE|LO_IMPORT|LO_EXPORT)\b/i,
    /\bCOPY\b/i,
    /;\s*\S/, // multiple statements
  ];

  for (const pattern of blocked) {
    if (pattern.test(trimmed)) {
      return { valid: false, error: "Requete bloquee : contient des instructions non autorisees." };
    }
  }

  return { valid: true };
}

/* ────────── Ensure LIMIT ────────── */

function ensureLimit(sql: string, max = 100): string {
  if (/\bLIMIT\b/i.test(sql)) return sql;
  return `${sql.replace(/;?\s*$/, "")} LIMIT ${max}`;
}

function normalizeGeneratedSql(sql: string): string {
  let normalized = sql;

  // Make date_trunc deterministic when the model inserts a raw string literal.
  normalized = normalized.replace(
    /date_trunc\(\s*'([^']+)'\s*,\s*'(\d{4}-\d{2}-\d{2})'\s*\)/gi,
    "date_trunc('$1', DATE '$2')",
  );

  normalized = normalized.replace(
    /date_trunc\(\s*'([^']+)'\s*,\s*'(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?)'\s*\)/gi,
    "date_trunc('$1', TIMESTAMP '$2')",
  );

  return normalized;
}

function buildConversationContext(turns: ConversationTurn[]): string {
  if (!turns.length) return "Aucun historique pertinent.";

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
  const compact = summary.replace(/\s+/g, " ").trim();
  if (!compact) return "";
  return compact.slice(0, 2500);
}

function isLikelyDataQuestion(question: string): boolean {
  const normalized = question
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (/\d/.test(normalized)) return true;
  if (DATA_KEYWORDS.some((keyword) => normalized.includes(keyword))) return true;
  if (/\b(combien|quel|quelle|quelles|liste|montre|donne|compare|tendance|dernier|recent)\b/.test(normalized)) {
    return true;
  }
  if (GENERAL_KEYWORDS.some((keyword) => normalized.includes(keyword))) return false;
  return false;
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

function formatFallbackAnswer(rows: Record<string, unknown>[], rowCount: number): string {
  if (rowCount === 0) {
    return "Aucun resultat trouve pour cette question. Essayez de preciser la periode ou le type de donnees recherche.";
  }

  if (rowCount === 1) {
    const firstRow = rows[0] ?? {};
    const entries = Object.entries(firstRow);

    if (entries.length === 1) {
      const [, value] = entries[0];
      return `Resultat: ${value == null ? "aucune valeur" : String(value)}.`;
    }
  }

  const preview = rows
    .slice(0, 3)
    .map((row) =>
      Object.entries(row)
        .slice(0, 4)
        .map(([key, value]) => `${key}: ${value == null ? "—" : String(value)}`)
        .join(" | "),
    )
    .join("\n");

  return `J'ai trouve ${rowCount} resultat${rowCount > 1 ? "s" : ""}.\n${preview}`;
}

/* ────────── POST handler ────────── */

export async function POST(req: NextRequest) {
  try {
    const openai = getOpenAIClient();
    const body = await req.json();
    const question: string = body?.question;
    const sessionSummary = normalizeSessionSummary(body?.sessionSummary);
    const conversation = Array.isArray(body?.conversation)
      ? body.conversation.filter(
          (turn: unknown): turn is ConversationTurn =>
            typeof turn === "object" &&
            turn !== null &&
            ((turn as ConversationTurn).role === "user" ||
              (turn as ConversationTurn).role === "assistant") &&
            typeof (turn as ConversationTurn).content === "string",
        )
      : [];

    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return Response.json({ error: "Question manquante." }, { status: 400 });
    }

    if (question.length > 1000) {
      return Response.json({ error: "Question trop longue (max 1000 caracteres)." }, { status: 400 });
    }

    /* ── Step 1 : Retrieve schema ── */
    const schema = await getSchema();
    const conversationContext = buildConversationContext(conversation);
    const memoryContext = sessionSummary
      ? `Resume de session:\n${sessionSummary}\n\nHistorique recent:\n${conversationContext}`
      : `Historique recent:\n${conversationContext}`;
    const currentDate = getCurrentDateContext();

    if (!isLikelyDataQuestion(question)) {
      const generalResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.3,
        max_tokens: 900,
        messages: [
          {
            role: "system",
            content: `Tu es Port Pulse IA, assistant de pilotage pour un terminal conteneurs.
Tu reponds aux questions generales sur les capacites du cockpit, son fonctionnement, ses vues d'analyse et la maniere d'utiliser l'application.

REGLES:
- Reponds en francais.
- Utilise un markdown propre et simple.
- Ne mentionne ni SQL, ni schema technique, ni details d'infrastructure.
- Si la question ne demande pas de chiffres calcules, ne fabrique pas de nombres.
- Oriente l'utilisateur vers les vues metier pertinentes: Pilotage du jour, Cumul annuel, Operations navires, Bulletins mensuels, Flotte & parc, Analyses KPIs, Correlations, Aide a la decision, Vue source globale, Trafic & EVP, Gate & camions, Escales lignes, Stock par ligne, KPIs terminal, Navires attendus, Navires appareilles, Navires en operation, Flux par escale, Capacite parc, Rapports source.
- Date de reference du jour: ${currentDate.frDate} (${currentDate.isoDate}).`,
          },
          {
            role: "user",
            content: `${memoryContext}

Question:
${question}`,
          },
        ],
      });

      return Response.json({
        answer:
          generalResponse.choices[0]?.message?.content ??
          "Je peux vous aider a naviguer dans Port Pulse, expliquer les vues d'analyse et vous guider sur les bons indicateurs a consulter.",
        sql: null,
        rows: [],
        rowCount: 0,
      });
    }

    /* ── Step 2 : Generate SQL via GPT-4o-mini ── */
    const sqlResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      max_tokens: 800,
      messages: [
        {
          role: "system",
          content: `Tu es un assistant expert PostgreSQL pour un terminal conteneurs portuaire (KCT - Konecranes Container Terminal).
Tu traduis les questions en francais en requetes SQL PostgreSQL valides.

REGLES STRICTES :
1. Genere UNIQUEMENT des requetes SELECT. Jamais INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, TRUNCATE.
2. N'utilise JAMAIS de fonctions systeme (pg_sleep, pg_read_file, lo_import, etc.).
3. Inclus toujours LIMIT (max 100 lignes).
4. Utilise UNIQUEMENT les tables et colonnes du schema ci-dessous.
5. Retourne UNIQUEMENT le SQL brut. Pas de markdown, pas de backticks, pas d'explication.
6. Les tables sont dans le schema "kct" — utilise toujours le prefixe kct. (ex: kct.kct_kpis).
7. Les dates sont souvent dans la colonne "date_rapport" (type date ou timestamp).
8. Pour les comparaisons de texte, utilise ILIKE pour etre insensible a la casse.
9. Quand on parle de "navires" pense a kct.kct_navires_operation, kct.kct_navires_attendus, kct.kct_navires_appareilles, kct.v_navires_performance.
10. Quand on parle de "conteneurs" ou "EVP/TEU" pense a kct.kct_parc_conteneurs, kct.kct_volumes_teu.
11. Quand on parle de "gate" ou "camions" pense a kct.kct_gate_ttt.
12. Quand on parle de "KPI" ou "performance" pense a kct.kct_kpis.
13. Quand on parle de "escales" pense a kct.kct_escales_armateurs, kct.kct_operations_escales.
14. Quand on parle de "rapport" ou "bulletin" pense a kct.kct_rapport_quotidien.
15. Pour les donnees mensuelles pense a kct.v_kct_monthly, pour le daily kct.v_kct_daily.
16. Utilise l'historique de conversation pour resoudre les references comme "et pour ce mois", "et les derniers", "compare avec avant".
17. Si la question vise un tableau de bord global ou une vue synthetique, privilegie les vues kct.v_kct_daily, kct.v_kct_weekly, kct.v_kct_monthly.
18. Si l'utilisateur demande "les dernieres escales" ou une formulation proche, cherche les donnees d'escales les plus recentes par date_rapport, sans supposer que CURRENT_DATE contient des lignes.
19. Si plusieurs tables sont candidates, choisis celle qui preserve le mieux le sens metier demande.
20. Quand une question contient des chiffres ou demande un calcul, recalculer explicitement depuis les donnees. Ne jamais deviner ni inventer un chiffre.
21. Utilise comme repere temporel la date du jour ${currentDate.isoDate}. Si l'utilisateur dit "aujourd'hui", "ce jour", "ce mois", "cette annee", interprete ces references par rapport a cette date, puis adapte vers la date_rapport la plus recente disponible si necessaire.
22. N'utilise jamais une date brute sous forme de chaine simple dans le SQL quand elle sert a un calcul ou a date_trunc.
23. Pour une date fixe, ecris toujours DATE 'YYYY-MM-DD'.
24. Pour une date et heure fixes, ecris toujours TIMESTAMP 'YYYY-MM-DD HH:MM:SS'.
25. Exemple correct: date_trunc('month', DATE '${currentDate.isoDate}'). Exemple interdit: date_trunc('month', '${currentDate.isoDate}').

CARTE FONCTIONNELLE ET LOGIQUE DE PILOTAGE :
${DOMAIN_GUIDE}

SCHEMA DE LA BASE DE DONNEES :
${schema}

EXEMPLES :
Question: "Combien de navires sont en operation aujourd'hui ?"
SQL: SELECT COUNT(*) as total FROM kct.kct_navires_operation WHERE date_rapport = CURRENT_DATE LIMIT 1

Question: "Quels sont les 10 derniers navires arrives ?"
SQL: SELECT * FROM kct.kct_navires_attendus ORDER BY date_rapport DESC LIMIT 10

Question: "Quel est le volume TEU du mois dernier ?"
SQL: SELECT * FROM kct.kct_volumes_teu WHERE date_rapport >= date_trunc('month', CURRENT_DATE - interval '1 month') AND date_rapport < date_trunc('month', CURRENT_DATE) ORDER BY date_rapport DESC LIMIT 100

Question: "Donne moi les KPI de performance de la derniere semaine"
SQL: SELECT * FROM kct.kct_kpis WHERE date_rapport >= CURRENT_DATE - interval '7 days' ORDER BY date_rapport DESC LIMIT 100

Question: "Quelles sont les escales du mois en cours ?"
SQL: SELECT * FROM kct.kct_escales_armateurs WHERE date_rapport >= date_trunc('month', DATE '${currentDate.isoDate}') AND date_rapport <= DATE '${currentDate.isoDate}' ORDER BY date_rapport DESC LIMIT 100`,
        },
        {
          role: "user",
          content: `${memoryContext}

Question courante:
${question}`,
        },
      ],
    });

    const rawSql = sqlResponse.choices[0]?.message?.content?.trim() ?? "";

    // Clean potential markdown wrapping
    const sql = rawSql
      .replace(/^```sql?\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();

    /* ── Step 3 : Validate SQL ── */
    const validation = validateSQL(sql);
    if (!validation.valid) {
      return Response.json({
        answer:
          "Desole, je n'ai pas pu generer une requete valide pour cette question. " +
          (validation.error ?? "") +
          " Pourriez-vous reformuler ?",
        sql: null,
        rows: [],
        rowCount: 0,
      });
    }

    const safeSql = ensureLimit(normalizeGeneratedSql(sql));

    /* ── Step 4 : Execute SQL on PostgreSQL ── */
    let queryResult: { rows: Record<string, unknown>[]; rowCount: number };
    try {
      queryResult = await withClient(async (client) => {
        await queryWithClient(client, "SET statement_timeout = 15000");
        const res = await queryWithClient<Record<string, unknown>>(client, safeSql);
        return { rows: res.rows, rowCount: res.rowCount ?? 0 };
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Chat SQL error:", message, "| SQL:", safeSql);
      return Response.json({
        answer: `La requete a echoue : ${message}. Essayez de reformuler votre question.`,
        sql: safeSql,
        rows: [],
        rowCount: 0,
      });
    }

    /* ── Step 5 : Interpret results with GPT-4o-mini ── */
    const truncatedRows =
      queryResult.rows.length > 50
        ? queryResult.rows.slice(0, 50)
        : queryResult.rows;

    let answer = "";
    try {
      const interpretResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.3,
        max_tokens: 1500,
        messages: [
          {
            role: "system",
            content: `Tu es un assistant analytique pour un terminal conteneurs portuaire.
L'utilisateur a pose une question sur les donnees operationnelles et une requete SQL a ete executee sur la base.

REGLES :
- Reponds en francais, de maniere claire, structuree et concise.
- Utilise un markdown propre et digestible.
- Commence toujours par une reponse naturelle, fluide, en langage normal, comme si tu repondais directement a l'utilisateur en 2 a 5 phrases maximum.
- Ensuite ajoute une section distincte avec exactement ce titre markdown: "## Détail structuré".
- Dans cette section detaillee, utilise si utile: "Lecture rapide", "Points cles", "Suite recommandee", "Point d'attention".
- Si les resultats sont vides, dis-le clairement et suggere une reformulation.
- Formate les nombres avec separateurs de milliers quand c'est pertinent.
- Formate les dates de maniere lisible (ex: "5 avril 2026").
- Ne mentionne JAMAIS le SQL, la base de donnees ou les noms techniques de colonnes.
- Utilise des listes a puces si pertinent.
- Si c'est un comptage simple, donne le chiffre directement.
- Si c'est une table de donnees, resume les tendances principales.
- Si la reponse se prete a des indicateurs, mets en avant 2 a 4 KPIs lisibles dans le texte.
- Si l'utilisateur est dans une logique de pilotage, souligne les ecarts, tendances, alertes capacitaires et implications operationnelles.
- Si des chiffres sont cites, ils doivent provenir des resultats fournis. Ne jamais extrapoler.
- Important: si les lignes representent des snapshots journaliers ou des etats successifs d'un meme mois, ne somme pas les lignes entre elles comme si c'etaient des flux independants.
- Dans ce cas, privilegie la derniere valeur disponible, l'evolution entre debut et fin de periode, et les variations de taux.
- Si plusieurs lignes repetent la meme date ou presque les memes indicateurs, dis-le implicitement dans la lecture en te concentrant sur la valeur la plus recente et la progression.
- La premiere partie doit rester naturelle et non mecanique. La partie detaillee vient seulement apres le titre "## Détail structuré".
- Quand tu vois net_prod_moy_appareilles, parle de productivite moyenne des navires appareilles en mvt/h.
- Quand tu vois net_prod_moy_operation, parle de productivite moyenne des navires en operation en mvt/h.
- Ne transforme jamais une productivite en pourcentage.
- Rappel metier: la productivite nette = nombre total de mouvements (T. Units) / temps operationnel reel en heures.
- Si la donnee fournie est net_prod_moy_appareilles, le perimetre est strictement limite aux navires appareilles.
- Si la donnee fournie est net_prod_moy_operation, le perimetre est strictement limite aux navires en operation.
- N'assimile pas automatiquement le temps operationnel reel a ATB-ATD si le working time reel est distinct ou si son detail n'est pas fourni.
- Si la source ne fournit pas la productivite par grue, ne l'invente pas et ne la suggere pas comme valeur calculee.
- Termine par une remarque analytique utile quand c'est pertinent.`,
          },
          {
            role: "user",
            content: `${memoryContext}

Question de l'utilisateur : "${question}"

Nombre de resultats : ${queryResult.rowCount}
Resultats (JSON) :
${JSON.stringify(truncatedRows, null, 2)}${
              queryResult.rows.length > 50
                ? `\n\n(... ${queryResult.rows.length - 50} lignes supplementaires tronquees)`
                : ""
            }`,
          },
        ],
      });

      answer =
        interpretResponse.choices[0]?.message?.content ??
        formatFallbackAnswer(queryResult.rows, queryResult.rowCount);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Chat interpretation error:", message);
      answer = formatFallbackAnswer(queryResult.rows, queryResult.rowCount);
    }

    return Response.json({
      answer,
      sql: safeSql,
      rows: queryResult.rows,
      rowCount: queryResult.rowCount,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Chat API error:", message);
    return Response.json(
      { error: "Erreur interne du serveur.", detail: message },
      { status: 500 },
    );
  }
}
