/**
 * Moteur analytique du terminal KCT.
 * Détection d'anomalies, lectures mensuelles et annuelles, croisements.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CORRECTION MAJEURE — SÉMANTIQUE DES VOLUMES
 *
 * `total_teu` est un CUMUL MENSUEL qui se réinitialise au premier bulletin de
 * chaque mois. La version précédente calculait moyenne et écart-type
 * directement sur ce cumul, ce qui déclenchait mécaniquement l'alerte
 * « volume anormalement bas » à chaque début de mois, sans aucun rapport avec
 * l'activité réelle.
 *
 * Le volume d'une journée est désormais lu dans `total_teu_jour`, produit par
 * `decumulateMonthlyVolumes()`. Le cumul reste utilisé là où il a un sens :
 * l'avancement du mois et la comparaison au budget.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * NOTE MÉTIER — TAUX D'OCCUPATION
 * Les taux d'occupation parc et reefers peuvent légitimement dépasser 100 %.
 * Ce sont des faits réels (gerbage au-delà de la capacité nominale, prises
 * temporaires). Ils ne sont ni bornés, ni corrigés, ni traités comme des
 * anomalies de données : au-delà de 100 %, l'alerte capacitaire qui se
 * déclenche est une alerte d'exploitation, pas un signalement d'erreur.
 */

import { INTELLIGENCE_THRESHOLDS, hasSufficientPearsonSample } from "@/lib/intelligence-config";
import {
  QUALITY_RULES,
  guardDailyVolume,
  guardTtt,
  isTrendBreak,
  normalizeDateOnly,
  safeAverage,
  safePercent,
  strictValueOf,
} from "@/lib/data-quality";

type GenericRow = Record<string, unknown>;

/* ── Helpers ── */

function toNum(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = avg(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

/**
 * Volume réalisé dans la journée.
 * Repli sur le cumul brut uniquement si le dé-cumul n'a pas pu être appliqué,
 * afin de ne jamais afficher un chiffre silencieusement faux.
 */
function dailyVolume(row: GenericRow): number {
  const decumulated = row.total_teu_jour;
  if (decumulated !== undefined && decumulated !== null) return toNum(decumulated);
  return 0;
}

function isDecumulated(row: GenericRow): boolean {
  return row.total_teu_jour !== undefined && row.volume_decumule_fiable === true;
}

const frInt = (value: number) => Math.round(value).toLocaleString("fr-FR");

/* ── Types ── */

export type InsightLevel = "info" | "warning" | "critical" | "success";

export interface Insight {
  id: string;
  level: InsightLevel;
  title: string;
  description: string;
  metric?: string;
  value?: number;
  threshold?: number;
  category: "anomaly" | "performance" | "capacity" | "suggestion" | "trend" | "quality";
}

export interface DailyAnalysis {
  date: string;
  /** Cumul du mois à la date du bulletin. */
  totalTeu: number;
  /** Volume réalisé dans la journée, dé-cumulé. */
  teuDuJour: number;
  /** Vrai si le dé-cumul a pu être calculé (bulletin précédent disponible). */
  volumeFiable: boolean;
  forecast: number;
  realisationPct: number;
  gapVsForecast: number;
  gateMovements: number;
  tttMinutes: number;
  occupancyPct: number;
  reeferPct: number;
  navOp: number;
  navAtt: number;
  navApp: number;
  productivity: number;
  /** Nombre de bulletins réellement exploités pour les références historiques. */
  sampleSize: number;
  insights: Insight[];
}

export interface MonthlyAnalysis {
  month: string;
  monthLabel: string;
  /** Cumul atteint en fin de mois. */
  totalTeu: number;
  forecast: number;
  realisationPct: number;
  /** Moyenne des volumes journaliers dé-cumulés, hors jours non renseignés. */
  avgDailyTeu: number;
  avgOccupancy: number;
  avgTtt: number;
  avgProductivity: number;
  totalGateMovements: number;
  escalesRealisees: number;
  escalesPrevues: number;
  daysReported: number;
  /** Jours du mois sans bulletin : rend la moyenne journalière comparable. */
  daysMissing: number;
  trendVsPrevious: number;
  insights: Insight[];
}

export interface AnnualAnalysis {
  year: number;
  totalTeu: number;
  avgMonthlyTeu: number;
  bestMonth: string;
  worstMonth: string;
  avgOccupancy: number;
  avgProductivity: number;
  avgTtt: number;
  totalGateMovements: number;
  growthTrend: number[];
  months: MonthlyAnalysis[];
  insights: Insight[];
}

export interface CrossAnalysisPoint {
  label: string;
  x: number;
  y: number;
  size?: number;
}

export interface CrossAnalysis {
  title: string;
  xLabel: string;
  yLabel: string;
  points: CrossAnalysisPoint[];
  correlation: number;
  sampleSize: number;
}

/* ── Analyse journalière ── */

export function analyzeDailyPerformance(
  dailyRows: GenericRow[],
  gateRows: GenericRow[],
  parcRows: GenericRow[],
  kpiRows: GenericRow[],
): DailyAnalysis | null {
  if (!dailyRows.length) return null;

  const latest = dailyRows[dailyRows.length - 1];
  const previous = dailyRows[dailyRows.length - 2];
  const date = normalizeDateOnly(latest.date_rapport);

  const totalTeu = toNum(latest.total_teu);
  const teuDuJour = dailyVolume(latest);
  const volumeFiable = isDecumulated(latest);
  const forecast = toNum(latest.total_forecast);
  const realisationPct = toNum(latest.taux_realisation_total_pct);
  const gapVsForecast = totalTeu - forecast;

  const latestGate = gateRows[gateRows.length - 1] ?? latest;
  const gateMovements = toNum(latestGate.gate_total_mouvements);
  const tttMinutes = toNum(latestGate.ttt_duree_minutes);

  const latestParc = parcRows[parcRows.length - 1] ?? latest;
  const occupancyPct = toNum(latestParc.taux_occupation_parc);
  const reeferPct = toNum(latestParc.taux_occupation_reefers);

  const latestKpi = kpiRows[kpiRows.length - 1] ?? latest;
  const productivity = toNum(latestKpi.kpi_net_prod_moy_appareilles);

  const insights: Insight[] = [];

  /* Référence historique : volumes journaliers dé-cumulés, jours nuls exclus. */
  const recentVolumes = dailyRows
    .slice(-30)
    .filter(isDecumulated)
    .map((r) => strictValueOf(guardDailyVolume(dailyVolume(r))))
    .filter((v): v is number => v !== null);

  const avgVolume = avg(recentVolumes);
  const sdVolume = stdDev(recentVolumes);
  const sampleSize = recentVolumes.length;

  const recentTtt = gateRows
    .slice(-30)
    .map((r) => strictValueOf(guardTtt(r.ttt_duree_minutes)))
    .filter((v): v is number => v !== null);
  const avgTtt = avg(recentTtt);

  /* ── Qualité : le lecteur doit savoir sur quoi il s'appuie ── */

  if (!volumeFiable && dailyRows.length > 1) {
    insights.push({
      id: "volume-non-decumule",
      level: "info",
      title: "Premier bulletin du mois",
      description:
        "Le cumul mensuel redémarre : le volume affiché correspond à la période écoulée depuis le 1er, pas à une seule journée.",
      category: "quality",
    });
  }

  if (previous && isTrendBreak(previous.date_rapport, latest.date_rapport)) {
    insights.push({
      id: "trou-collecte",
      level: "warning",
      title: "Interruption de collecte",
      description: `Aucun bulletin entre le ${normalizeDateOnly(previous.date_rapport)} et le ${date}. Les écarts affichés couvrent plusieurs jours.`,
      category: "quality",
    });
  }

  /* ── Volume : comparaison désormais faite sur des journées comparables ── */

  if (sampleSize >= QUALITY_RULES.minSampleForAverage && sdVolume > 0 && teuDuJour > 0) {
    if (teuDuJour < avgVolume - INTELLIGENCE_THRESHOLDS.tttSpikeMultiplier * sdVolume) {
      insights.push({
        id: "low-volume",
        level: "warning",
        title: "Volume du jour anormalement bas",
        description: `${frInt(teuDuJour)} TEU réalisés, contre une moyenne de ${frInt(avgVolume)} TEU sur les ${sampleSize} derniers bulletins exploitables.`,
        metric: "total_teu_jour",
        value: teuDuJour,
        threshold: avgVolume - INTELLIGENCE_THRESHOLDS.tttSpikeMultiplier * sdVolume,
        category: "anomaly",
      });
    } else if (teuDuJour > avgVolume + 2 * sdVolume) {
      insights.push({
        id: "high-volume",
        level: "info",
        title: "Pic de volume",
        description: `${frInt(teuDuJour)} TEU réalisés, nettement au-dessus de la moyenne de ${frInt(avgVolume)} TEU.`,
        metric: "total_teu_jour",
        value: teuDuJour,
        category: "trend",
      });
    }
  }

  /* ── Budget : lecture sur le cumul, où elle a du sens ── */

  if (realisationPct > 0 && realisationPct < INTELLIGENCE_THRESHOLDS.budgetWarningPct) {
    insights.push({
      id: "under-performance",
      level: "warning",
      title: "Sous-réalisation budgétaire",
      description: `Réalisation à ${realisationPct.toFixed(1)} % du budget (seuil ${INTELLIGENCE_THRESHOLDS.budgetWarningPct} %). Écart de ${frInt(Math.abs(gapVsForecast))} TEU sur le cumul du mois.`,
      metric: "taux_realisation",
      value: realisationPct,
      threshold: INTELLIGENCE_THRESHOLDS.budgetWarningPct,
      category: "performance",
    });
  } else if (realisationPct >= 100) {
    insights.push({
      id: "over-performance",
      level: "success",
      title: "Objectif budgétaire atteint",
      description: `Réalisation à ${realisationPct.toFixed(1)} % du budget, soit ${frInt(gapVsForecast)} TEU au-dessus de la cible.`,
      metric: "taux_realisation",
      value: realisationPct,
      category: "performance",
    });
  }

  /* ── Capacité : au-delà de 100 %, c'est un fait d'exploitation, pas une erreur ── */

  if (occupancyPct >= 100) {
    insights.push({
      id: "park-over-capacity",
      level: "critical",
      title: "Parc au-delà de sa capacité nominale",
      description: `Occupation à ${occupancyPct.toFixed(1)} %. Le parc accueille plus que sa capacité de référence : marge de manœuvre nulle sur les réceptions.`,
      metric: "taux_occupation_parc",
      value: occupancyPct,
      threshold: 100,
      category: "capacity",
    });
  } else if (occupancyPct >= INTELLIGENCE_THRESHOLDS.parkCriticalPct) {
    insights.push({
      id: "park-saturation",
      level: "critical",
      title: "Risque de saturation du parc",
      description: `Occupation à ${occupancyPct.toFixed(1)} %. Capacité quasi atteinte, risque de blocage opérationnel.`,
      metric: "taux_occupation_parc",
      value: occupancyPct,
      threshold: INTELLIGENCE_THRESHOLDS.parkCriticalPct,
      category: "capacity",
    });
  } else if (occupancyPct >= INTELLIGENCE_THRESHOLDS.parkWarningPct) {
    insights.push({
      id: "park-high",
      level: "warning",
      title: "Occupation du parc élevée",
      description: `Occupation à ${occupancyPct.toFixed(1)} %. Tendance à surveiller.`,
      metric: "taux_occupation_parc",
      value: occupancyPct,
      threshold: INTELLIGENCE_THRESHOLDS.parkWarningPct,
      category: "capacity",
    });
  }

  if (reeferPct >= 100) {
    insights.push({
      id: "reefer-over-capacity",
      level: "critical",
      title: "Prises reefers au-delà de la capacité de référence",
      description: `Occupation reefers à ${reeferPct.toFixed(1)} %. Toutes les prises sont mobilisées : prioriser les évacuations.`,
      metric: "taux_occupation_reefers",
      value: reeferPct,
      threshold: 100,
      category: "capacity",
    });
  } else if (reeferPct >= INTELLIGENCE_THRESHOLDS.reeferWarningPct) {
    insights.push({
      id: "reefer-high",
      level: "warning",
      title: "Reefers sous pression",
      description: `Occupation reefers à ${reeferPct.toFixed(1)} %. Planifier une rotation.`,
      metric: "taux_occupation_reefers",
      value: reeferPct,
      threshold: INTELLIGENCE_THRESHOLDS.reeferWarningPct,
      category: "capacity",
    });
  }

  /* ── Gate et productivité ── */

  if (avgTtt > 0 && tttMinutes > avgTtt * INTELLIGENCE_THRESHOLDS.tttSpikeMultiplier) {
    insights.push({
      id: "ttt-high",
      level: "warning",
      title: "Temps de rotation camion élevé",
      description: `TTT de ${Math.round(tttMinutes)} min, contre ${Math.round(avgTtt)} min en moyenne. Congestion probable au gate.`,
      metric: "ttt_duree_minutes",
      value: tttMinutes,
      threshold: avgTtt * INTELLIGENCE_THRESHOLDS.tttSpikeMultiplier,
      category: "anomaly",
    });
  }

  if (productivity > 0 && productivity < INTELLIGENCE_THRESHOLDS.productivityWarningMvtsPerHour) {
    insights.push({
      id: "low-productivity",
      level: "warning",
      title: "Productivité faible",
      description: `Productivité nette moyenne à ${productivity.toFixed(1)} mvt/h, sous le seuil opérationnel de ${INTELLIGENCE_THRESHOLDS.productivityWarningMvtsPerHour} mvt/h.`,
      metric: "kpi_net_prod",
      value: productivity,
      threshold: INTELLIGENCE_THRESHOLDS.productivityWarningMvtsPerHour,
      category: "performance",
    });
  }

  const recentGate = gateRows
    .slice(-14)
    .map((r) => toNum(r.gate_total_mouvements))
    .filter((v) => v > 0);

  if (
    gateMovements > 0 &&
    recentGate.length >= QUALITY_RULES.minSampleForAverage &&
    gateMovements < avg(recentGate) * 0.6
  ) {
    insights.push({
      id: "low-gate",
      level: "info",
      title: "Activité gate faible",
      description: `${frInt(gateMovements)} mouvements, soit moins de 60 % de la moyenne des deux dernières semaines. Jour férié ou fermeture partielle ?`,
      category: "suggestion",
    });
  }

  return {
    date,
    totalTeu,
    teuDuJour,
    volumeFiable,
    forecast,
    realisationPct,
    gapVsForecast,
    gateMovements,
    tttMinutes,
    occupancyPct,
    reeferPct,
    navOp: toNum(latest.nb_navires_en_operation),
    navAtt: toNum(latest.nb_navires_attendus),
    navApp: toNum(latest.nb_navires_appareilles),
    productivity,
    sampleSize,
    insights,
  };
}

/* ── Analyse mensuelle ── */

function daysInMonth(monthKey: string): number {
  const year = Number(monthKey.slice(0, 4));
  const month = Number(monthKey.slice(5, 7));
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function analyzeMonthly(dailyRows: GenericRow[], gateRows: GenericRow[]): MonthlyAnalysis[] {
  const byMonth = new Map<string, GenericRow[]>();
  const gateByMonth = new Map<string, GenericRow[]>();

  for (const row of dailyRows) {
    const d = normalizeDateOnly(row.date_rapport);
    if (!d) continue;
    const m = d.slice(0, 7);
    const arr = byMonth.get(m) ?? [];
    arr.push(row);
    byMonth.set(m, arr);
  }

  for (const row of gateRows) {
    const d = normalizeDateOnly(row.date_rapport);
    if (!d) continue;
    const m = d.slice(0, 7);
    const arr = gateByMonth.get(m) ?? [];
    arr.push(row);
    gateByMonth.set(m, arr);
  }

  const months = Array.from(byMonth.keys()).sort();
  const results: MonthlyAnalysis[] = [];

  for (let i = 0; i < months.length; i++) {
    const month = months[i];
    const rows = byMonth.get(month) ?? [];
    const gRows = gateByMonth.get(month) ?? [];
    const latestRow = rows[rows.length - 1] ?? {};

    // Le cumul de fin de mois est la valeur maximale atteinte, et non la
    // dernière lue : une correction de saisie peut faire reculer le cumul.
    const totalTeu = Math.max(...rows.map((r) => toNum(r.total_teu)), 0);
    const forecast = toNum(latestRow.total_forecast);
    const realisationPct = toNum(latestRow.taux_realisation_total_pct);

    // Moyenne journalière : sur les volumes dé-cumulés, jours nuls exclus.
    const dailyAverage = safeAverage(rows.filter(isDecumulated).map((r) => guardDailyVolume(dailyVolume(r))));

    const occupancyAverage = safeAverage(
      rows
        .map((r) => toNum(r.taux_occupation_parc))
        .filter((v) => v > 0)
        .map((v) => ({ status: "ok" as const, value: v })),
    );

    const tttAverage = safeAverage(gRows.map((r) => guardTtt(r.ttt_duree_minutes)));

    const productivityAverage = safeAverage(
      rows
        .map((r) => toNum(r.kpi_net_prod_moy_appareilles))
        .filter((v) => v > 0)
        .map((v) => ({ status: "ok" as const, value: v })),
    );

    const totalGateMovements = gRows.reduce((s, r) => s + toNum(r.gate_total_mouvements), 0);
    const escalesRealisees = toNum(latestRow.escales_total_realisees);
    const escalesPrevues = toNum(latestRow.escales_total_prevues);

    const prevMonth = i > 0 ? results[i - 1] : null;
    const trendVsPrevious = prevMonth && prevMonth.totalTeu > 0
      ? ((totalTeu - prevMonth.totalTeu) / prevMonth.totalTeu) * 100
      : 0;

    const daysReported = rows.length;
    const daysMissing = Math.max(daysInMonth(month) - daysReported, 0);

    const insights: Insight[] = [];

    if (daysMissing > QUALITY_RULES.maxGapDaysForTrend) {
      insights.push({
        id: `${month}-couverture`,
        level: "info",
        title: "Couverture partielle du mois",
        description: `${daysReported} bulletins sur ${daysInMonth(month)} jours. Les cumuls sous-estiment l'activité réelle du mois.`,
        category: "quality",
      });
    }

    if (realisationPct > 0 && realisationPct < INTELLIGENCE_THRESHOLDS.operationalWarningPct) {
      insights.push({
        id: `${month}-underperform`,
        level: "warning",
        title: "Sous-performance mensuelle",
        description: `Réalisation à ${realisationPct.toFixed(1)} % du budget sur ${month}.`,
        category: "performance",
      });
    }

    // Une variation de cumul n'est comparable que si les deux mois sont
    // couverts de façon comparable.
    const comparable = prevMonth ? Math.abs(prevMonth.daysMissing - daysMissing) <= QUALITY_RULES.maxGapDaysForTrend : false;

    if (comparable && trendVsPrevious < -15) {
      insights.push({
        id: `${month}-decline`,
        level: "warning",
        title: "Baisse de volume",
        description: `Volume en baisse de ${Math.abs(trendVsPrevious).toFixed(1)} % par rapport au mois précédent.`,
        category: "trend",
      });
    } else if (comparable && trendVsPrevious > 20) {
      insights.push({
        id: `${month}-growth`,
        level: "success",
        title: "Croissance forte",
        description: `Volume en hausse de ${trendVsPrevious.toFixed(1)} % par rapport au mois précédent.`,
        category: "trend",
      });
    }

    if (occupancyAverage.publishable && (occupancyAverage.value ?? 0) > INTELLIGENCE_THRESHOLDS.parkWarningPct) {
      insights.push({
        id: `${month}-high-occ`,
        level: "warning",
        title: "Occupation du parc élevée",
        description: `Occupation moyenne de ${(occupancyAverage.value ?? 0).toFixed(1)} % sur le mois.`,
        category: "capacity",
      });
    }

    const dateObj = new Date(`${month}-01T00:00:00Z`);
    const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(dateObj);

    results.push({
      month,
      monthLabel,
      totalTeu,
      forecast,
      realisationPct,
      avgDailyTeu: dailyAverage.publishable ? (dailyAverage.value ?? 0) : 0,
      avgOccupancy: occupancyAverage.value ?? 0,
      avgTtt: tttAverage.value ?? 0,
      avgProductivity: productivityAverage.value ?? 0,
      totalGateMovements,
      escalesRealisees,
      escalesPrevues,
      daysReported,
      daysMissing,
      trendVsPrevious,
      insights,
    });
  }

  return results;
}

/* ── Analyse annuelle ── */

export function analyzeAnnual(monthlyAnalyses: MonthlyAnalysis[]): AnnualAnalysis | null {
  if (!monthlyAnalyses.length) return null;

  const year = Number(monthlyAnalyses[0].month.slice(0, 4));
  const totalTeu = monthlyAnalyses.reduce((s, m) => s + m.totalTeu, 0);
  const avgMonthlyTeu = avg(monthlyAnalyses.map((m) => m.totalTeu));

  // Un mois partiellement couvert ne peut pas être désigné « pire mois ».
  const comparableMonths = monthlyAnalyses.filter(
    (m) => m.daysMissing <= QUALITY_RULES.maxGapDaysForTrend,
  );
  const ranked = [...(comparableMonths.length >= 2 ? comparableMonths : monthlyAnalyses)]
    .sort((a, b) => b.totalTeu - a.totalTeu);

  const bestMonth = ranked[0]?.monthLabel ?? "Non déterminé";
  const worstMonth = ranked[ranked.length - 1]?.monthLabel ?? "Non déterminé";

  const occupancy = safeAverage(
    monthlyAnalyses.filter((m) => m.avgOccupancy > 0).map((m) => ({ status: "ok" as const, value: m.avgOccupancy })),
  );
  const productivity = safeAverage(
    monthlyAnalyses.filter((m) => m.avgProductivity > 0).map((m) => ({ status: "ok" as const, value: m.avgProductivity })),
  );
  const ttt = safeAverage(
    monthlyAnalyses.filter((m) => m.avgTtt > 0).map((m) => ({ status: "ok" as const, value: m.avgTtt })),
  );

  const totalGateMovements = monthlyAnalyses.reduce((s, m) => s + m.totalGateMovements, 0);
  const growthTrend = monthlyAnalyses.map((m) => m.totalTeu);

  const insights: Insight[] = [];

  if (comparableMonths.length >= 6) {
    const first3 = avg(comparableMonths.slice(0, 3).map((m) => m.totalTeu));
    const last3 = avg(comparableMonths.slice(-3).map((m) => m.totalTeu));
    const growth = first3 > 0 ? ((last3 - first3) / first3) * 100 : 0;
    if (growth > 10) {
      insights.push({
        id: "annual-growth",
        level: "success",
        title: "Tendance haussière",
        description: `Croissance de ${growth.toFixed(1)} % entre les trois premiers et les trois derniers mois pleinement couverts.`,
        category: "trend",
      });
    } else if (growth < -10) {
      insights.push({
        id: "annual-decline",
        level: "warning",
        title: "Tendance baissière",
        description: `Baisse de ${Math.abs(growth).toFixed(1)} % entre les trois premiers et les trois derniers mois pleinement couverts.`,
        category: "trend",
      });
    }
  }

  const partialMonths = monthlyAnalyses.length - comparableMonths.length;
  if (partialMonths > 0) {
    insights.push({
      id: "annual-couverture",
      level: "info",
      title: "Couverture inégale sur l'année",
      description: `${partialMonths} mois sur ${monthlyAnalyses.length} ne sont que partiellement renseignés. Les comparaisons inter-mois portent sur les mois pleinement couverts.`,
      category: "quality",
    });
  }

  if (occupancy.publishable && (occupancy.value ?? 0) > INTELLIGENCE_THRESHOLDS.parkWarningPct) {
    insights.push({
      id: "annual-occ",
      level: "warning",
      title: "Pression capacitaire durable",
      description: `Occupation moyenne du parc à ${(occupancy.value ?? 0).toFixed(1)} % sur l'année. Tension structurelle.`,
      category: "capacity",
    });
  }

  return {
    year,
    totalTeu,
    avgMonthlyTeu,
    bestMonth,
    worstMonth,
    avgOccupancy: occupancy.value ?? 0,
    avgProductivity: productivity.value ?? 0,
    avgTtt: ttt.value ?? 0,
    totalGateMovements,
    growthTrend,
    months: monthlyAnalyses,
    insights,
  };
}

/* ── Croisements ── */

export function buildCrossAnalysis(
  dailyRows: GenericRow[],
  gateRows: GenericRow[],
  _parcRows: GenericRow[],
  performanceRows: GenericRow[],
): CrossAnalysis[] {
  const results: CrossAnalysis[] = [];

  const push = (
    title: string,
    xLabel: string,
    yLabel: string,
    points: CrossAnalysisPoint[],
  ) => {
    if (!hasSufficientPearsonSample(points.length)) return;
    results.push({
      title,
      xLabel,
      yLabel,
      points,
      correlation: computeCorrelation(points.map((p) => p.x), points.map((p) => p.y)),
      sampleSize: points.length,
    });
  };

  /* 1. Volume journalier réel vs mouvements gate.
        Croiser un cumul avec un flux produisait une corrélation artificielle
        proche de 1, qui ne mesurait que l'écoulement du mois. */
  const volGate: CrossAnalysisPoint[] = [];
  for (const row of dailyRows) {
    if (!isDecumulated(row)) continue;
    const teu = dailyVolume(row);
    const gate = toNum(row.gate_total_mouvements);
    if (teu > 0 && gate > 0) {
      volGate.push({ label: normalizeDateOnly(row.date_rapport), x: teu, y: gate });
    }
  }
  push("Volume du jour et mouvements gate", "Volume réalisé (TEU)", "Mouvements gate", volGate);

  /* 2. Occupation du parc vs volume journalier réel */
  const occVol: CrossAnalysisPoint[] = [];
  for (const row of dailyRows) {
    if (!isDecumulated(row)) continue;
    const occ = toNum(row.taux_occupation_parc);
    const teu = dailyVolume(row);
    if (occ > 0 && teu > 0) {
      occVol.push({ label: normalizeDateOnly(row.date_rapport), x: occ, y: teu });
    }
  }
  push("Occupation du parc et volume du jour", "Occupation du parc (%)", "Volume réalisé (TEU)", occVol);

  /* 3. Camions vs TTT */
  const tttCam: CrossAnalysisPoint[] = [];
  for (const row of gateRows) {
    const ttt = strictValueOf(guardTtt(row.ttt_duree_minutes));
    const cam = toNum(row.ttt_total_camions);
    if (ttt !== null && cam > 0) {
      tttCam.push({ label: normalizeDateOnly(row.date_rapport), x: cam, y: ttt });
    }
  }
  push("Affluence camions et temps de rotation", "Nombre de camions", "TTT (min)", tttCam);

  /* 4. Nombre d'escales vs productivité moyenne */
  const escProd: CrossAnalysisPoint[] = [];
  const perfByDate = new Map<string, { units: number; prod: number; count: number }>();
  for (const row of performanceRows) {
    const d = normalizeDateOnly(row.date_rapport);
    if (!d) continue;
    const e = perfByDate.get(d) ?? { units: 0, prod: 0, count: 0 };
    e.units += toNum(row.t_units);
    e.prod += toNum(row.net_prod);
    e.count += 1;
    perfByDate.set(d, e);
  }
  for (const [date, e] of perfByDate) {
    if (e.count > 0 && e.units > 0) {
      escProd.push({ label: date, x: e.count, y: e.prod / e.count, size: e.units });
    }
  }
  push("Nombre d'escales et productivité moyenne", "Escales dans la journée", "Productivité (mvt/h)", escProd);

  /* 5. Occupation du parc vs TTT */
  const occTtt: CrossAnalysisPoint[] = [];
  for (const row of dailyRows) {
    const occ = toNum(row.taux_occupation_parc);
    const ttt = strictValueOf(guardTtt(row.ttt_duree_minutes));
    if (occ > 0 && ttt !== null) {
      occTtt.push({ label: normalizeDateOnly(row.date_rapport), x: occ, y: ttt });
    }
  }
  push("Occupation du parc et temps de rotation", "Occupation du parc (%)", "TTT (min)", occTtt);

  return results;
}

/* ── Corrélation ── */

function computeCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (!hasSufficientPearsonSample(n)) return 0;
  const mx = avg(x.slice(0, n));
  const my = avg(y.slice(0, n));
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i] - mx) * (y[i] - my);
    dx += (x[i] - mx) ** 2;
    dy += (y[i] - my) ** 2;
  }
  const denom = Math.sqrt(dx * dy);
  return denom > 0 ? num / denom : 0;
}

/* ── Agrégation des signaux ── */

export function generateIntelligence(
  dailyAnalysis: DailyAnalysis | null,
  monthlyAnalyses: MonthlyAnalysis[],
  annualAnalysis: AnnualAnalysis | null,
  crossAnalyses: CrossAnalysis[],
): Insight[] {
  const all: Insight[] = [];

  if (dailyAnalysis) all.push(...dailyAnalysis.insights);

  const lastMonth = monthlyAnalyses[monthlyAnalyses.length - 1];
  if (lastMonth) all.push(...lastMonth.insights);

  if (annualAnalysis) all.push(...annualAnalysis.insights);

  for (const ca of crossAnalyses) {
    if (hasSufficientPearsonSample(ca.sampleSize) && Math.abs(ca.correlation) > 0.7) {
      const direction = ca.correlation > 0 ? "positive" : "inverse";
      all.push({
        id: `corr-${ca.title}`,
        level: "info",
        title: `Corrélation ${direction} forte`,
        description: `${ca.title} : r = ${ca.correlation.toFixed(2)} sur ${ca.sampleSize} observations. Lien statistique marqué, qui n'établit pas une causalité.`,
        category: "trend",
      });
    }
  }

  // Dédoublonnage : un même signal remonté par plusieurs niveaux d'analyse
  // ne doit apparaître qu'une fois.
  const seen = new Set<string>();
  const unique = all.filter((insight) => {
    if (seen.has(insight.id)) return false;
    seen.add(insight.id);
    return true;
  });

  const order: Record<InsightLevel, number> = { critical: 0, warning: 1, info: 2, success: 3 };
  return unique.sort((a, b) => order[a.level] - order[b.level]);
}

/* ── Compatibilité ── */

export { safePercent };
