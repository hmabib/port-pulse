/**
 * Contexte transmis à l'assistant.
 *
 * Sans lui, l'assistant est aveugle : l'utilisateur filtre sur mars 2026 et
 * CMA CGM, demande « et la productivité ? », et reçoit une réponse portant sur
 * l'ensemble de la base. La réponse est juste techniquement, fausse pour
 * l'utilisateur. Ces quelques champs suffisent à supprimer ce décalage.
 */

export interface ChatKpi {
  label: string;
  value: string;
  unit?: string;
}

export interface ChatContext {
  /** Identifiant de la vue active. */
  vue: string;
  /** Libellé lisible de la vue. */
  vueLabel: string;
  /** Question à laquelle la vue répond — cadre l'intention de l'utilisateur. */
  questionVue: string;
  periode: { debut: string | null; fin: string | null; label: string };
  filtres: { annee?: string; mois?: string; jour?: string; armateur?: string };
  bulletinActif: string;
  /** Indicateurs réellement sous les yeux de l'utilisateur. */
  kpis: ChatKpi[];
  /** Alertes opérationnelles actuellement affichées dans le cockpit. */
  alertes: string[];
  qualite: {
    bulletinsExploites: number;
    joursManquants: number;
    couverturePct: number | null;
  };
}

/** Question métier portée par chaque vue, reprise telle quelle dans le prompt. */
export const VIEW_QUESTIONS: Record<string, { label: string; question: string }> = {
  situation: {
    label: "Pilotage",
    question: "Que se passe-t-il aujourd'hui, et dois-je agir ?",
  },
  cumul2026: {
    label: "Performance — cumul annuel",
    question: "Tenons-nous nos objectifs sur la période ?",
  },
  operations: {
    label: "Opérations navires",
    question: "Comment se déroulent les escales ?",
  },
  bulletin: {
    label: "Performance — bulletins mensuels",
    question: "Quelle est la tendance mois par mois ?",
  },
  navires: {
    label: "Flotte & parc",
    question: "Comment se répartit le stock et quels navires sont attendus ?",
  },
  analyse: {
    label: "Performance — analyses KPIs",
    question: "Quels indicateurs se dégradent ou progressent ?",
  },
  croisee: {
    label: "Analyse — corrélations",
    question: "Quels indicateurs sont liés entre eux ?",
  },
  intelligence: {
    label: "Analyse — aide à la décision",
    question: "Pourquoi observe-t-on ces tensions, et sur quoi agir ?",
  },
  segments: {
    label: "Données sources",
    question: "Que contient précisément la donnée brute ?",
  },
  chat: {
    label: "Assistant",
    question: "Pose ta question, en français.",
  },
  quality: {
    label: "Qualité des données",
    question: "Les chiffres affichés sont-ils suffisamment couverts et fiables ?",
  },
};

/** Rendu texte du contexte, injecté dans les prompts. */
export function describeContext(context: ChatContext | null): string {
  if (!context) return "Aucun contexte de vue transmis.";

  const lines: string[] = [
    `Vue active : ${context.vueLabel} — « ${context.questionVue} »`,
    `Période affichée : ${context.periode.label}`,
    `Bulletin de référence : ${context.bulletinActif || "non déterminé"}`,
  ];

  const filtres = Object.entries(context.filtres)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key} = ${value}`);
  lines.push(
    filtres.length > 0
      ? `Filtres actifs : ${filtres.join(", ")}`
      : "Filtres actifs : aucun (périmètre complet)",
  );

  if (context.kpis.length > 0) {
    lines.push(
      `Indicateurs affichés à l'écran : ${context.kpis
        .map((k) => `${k.label} = ${k.value}${k.unit ? ` ${k.unit}` : ""}`)
        .join(" | ")}`,
    );
  }

  lines.push(
    context.alertes.length > 0
      ? `Alertes en cours : ${context.alertes.join(" | ")}`
      : "Alertes en cours : aucune",
  );

  lines.push(
    `Qualité du périmètre : ${context.qualite.bulletinsExploites} bulletins exploités` +
      (context.qualite.joursManquants > 0
        ? `, ${context.qualite.joursManquants} jours sans bulletin`
        : ", couverture complète") +
      (context.qualite.couverturePct !== null ? ` (${context.qualite.couverturePct} %)` : ""),
  );

  return lines.join("\n");
}

/** Convertit les filtres du cockpit en clause temporelle exploitable en SQL. */
export function describePeriodConstraint(context: ChatContext | null): string {
  if (!context) return "";
  const { debut, fin } = context.periode;
  if (debut && fin) {
    return `IMPORTANT : sauf demande explicite d'une autre période, restreins la requête à date_rapport BETWEEN DATE '${debut}' AND DATE '${fin}'.`;
  }
  return "";
}
