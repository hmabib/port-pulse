/**
 * Analytics engine for KCT terminal data.
 * Provides anomaly detection, insights, cross-analysis, and intelligence.
 */

type GenericRow = Record<string, unknown>;

/* ── Helpers ── */

function toNum(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function toStr(v: unknown): string {
  return typeof v === "string" && v.trim() ? v : String(v ?? "");
}

function normalizeDate(v: unknown): string {
  const t = toStr(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  return "";
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
  category: "anomaly" | "performance" | "capacity" | "suggestion" | "trend";
}

export interface DailyAnalysis {
  date: string;
  totalTeu: number;
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
  insights: Insight[];
}

export interface MonthlyAnalysis {
  month: string;
  monthLabel: string;
  totalTeu: number;
  forecast: number;
  realisationPct: number;
  avgDailyTeu: number;
  avgOccupancy: number;
  avgTtt: number;
  avgProductivity: number;
  totalGateMovements: number;
  escalesRealisees: number;
  escalesPrevues: number;
  daysReported: number;
  trendVsPrevious: number; // % change vs previous month
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
}

/* ── Daily Analysis ── */

export function analyzeDailyPerformance(
  dailyRows: GenericRow[],
  gateRows: GenericRow[],
  parcRows: GenericRow[],
  kpiRows: GenericRow[],
): DailyAnalysis | null {
  if (!dailyRows.length) return null;

  const latest = dailyRows[dailyRows.length - 1];
  const date = normalizeDate(latest.date_rapport);
  const totalTeu = toNum(latest.total_teu);
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

  // Historical context (last 30 days)
  const recentTeu = dailyRows.slice(-30).map((r) => toNum(r.total_teu));
  const avgTeu = avg(recentTeu);
  const sdTeu = stdDev(recentTeu);

  const recentOcc = dailyRows.slice(-30).map((r) => toNum(r.taux_occupation_parc));
  const avgOcc = avg(recentOcc);

  const recentTtt = gateRows.slice(-30).map((r) => toNum(r.ttt_duree_minutes));
  const avgTtt = avg(recentTtt);

  // Anomaly: TEU significantly below average
  if (sdTeu > 0 && totalTeu < avgTeu - 1.5 * sdTeu && totalTeu > 0) {
    insights.push({
      id: "low-volume",
      level: "warning",
      title: "Volume anormalement bas",
      description: `Le volume du jour (${totalTeu.toLocaleString("fr-FR")} TEU) est significativement inferieur a la moyenne de 30j (${Math.round(avgTeu).toLocaleString("fr-FR")} TEU).`,
      metric: "total_teu",
      value: totalTeu,
      threshold: avgTeu - 1.5 * sdTeu,
      category: "anomaly",
    });
  }

  // Anomaly: TEU significantly above average
  if (sdTeu > 0 && totalTeu > avgTeu + 2 * sdTeu) {
    insights.push({
      id: "high-volume",
      level: "info",
      title: "Volume exceptionnellement eleve",
      description: `Le volume du jour (${totalTeu.toLocaleString("fr-FR")} TEU) depasse significativement la moyenne.`,
      metric: "total_teu",
      value: totalTeu,
      category: "trend",
    });
  }

  // Performance: sous-realisation
  if (realisationPct > 0 && realisationPct < 85) {
    insights.push({
      id: "under-performance",
      level: "warning",
      title: "Sous-realisation budgetaire",
      description: `Taux de realisation a ${realisationPct.toFixed(1)}% (< 85%). Ecart de ${Math.abs(gapVsForecast).toLocaleString("fr-FR")} TEU vs forecast.`,
      metric: "taux_realisation",
      value: realisationPct,
      threshold: 85,
      category: "performance",
    });
  } else if (realisationPct >= 100) {
    insights.push({
      id: "over-performance",
      level: "success",
      title: "Objectif budgetaire atteint",
      description: `Realisation a ${realisationPct.toFixed(1)}% du budget. Surplus de ${gapVsForecast.toLocaleString("fr-FR")} TEU.`,
      metric: "taux_realisation",
      value: realisationPct,
      category: "performance",
    });
  }

  // Capacity: saturation parc
  if (occupancyPct >= 95) {
    insights.push({
      id: "park-saturation",
      level: "critical",
      title: "Risque de saturation parc",
      description: `Taux d'occupation a ${occupancyPct.toFixed(1)}%. Capacite quasi-atteinte, risque de blocage operationnel.`,
      metric: "taux_occupation_parc",
      value: occupancyPct,
      threshold: 95,
      category: "capacity",
    });
  } else if (occupancyPct >= 85) {
    insights.push({
      id: "park-high",
      level: "warning",
      title: "Occupation parc elevee",
      description: `Taux d'occupation a ${occupancyPct.toFixed(1)}%. Tendance a surveiller.`,
      metric: "taux_occupation_parc",
      value: occupancyPct,
      threshold: 85,
      category: "capacity",
    });
  }

  // Reefer capacity
  if (reeferPct >= 80) {
    insights.push({
      id: "reefer-high",
      level: "warning",
      title: "Reefers sous pression",
      description: `Taux d'occupation reefers a ${reeferPct.toFixed(1)}%. Planifier une rotation.`,
      metric: "taux_occupation_reefers",
      value: reeferPct,
      threshold: 80,
      category: "capacity",
    });
  }

  // TTT anomaly
  if (avgTtt > 0 && tttMinutes > avgTtt * 1.5) {
    insights.push({
      id: "ttt-high",
      level: "warning",
      title: "TTT anormalement eleve",
      description: `TTT de ${tttMinutes} min depasse de 50% la moyenne (${Math.round(avgTtt)} min). Congestion possible.`,
      metric: "ttt_duree_minutes",
      value: tttMinutes,
      threshold: avgTtt * 1.5,
      category: "anomaly",
    });
  }

  // Low productivity
  if (productivity > 0 && productivity < 20) {
    insights.push({
      id: "low-productivity",
      level: "warning",
      title: "Productivite faible",
      description: `Productivite nette a ${productivity.toFixed(1)} mvts/h. En dessous du seuil operationnel.`,
      metric: "kpi_net_prod",
      value: productivity,
      threshold: 20,
      category: "performance",
    });
  }

  // Suggestion: low gate
  if (gateMovements > 0 && gateMovements < avg(gateRows.slice(-14).map((r) => toNum(r.gate_total_mouvements))) * 0.6) {
    insights.push({
      id: "low-gate",
      level: "info",
      title: "Activite gate faible",
      description: `Seulement ${gateMovements} mouvements. Jour calme ou fermeture partielle ?`,
      category: "suggestion",
    });
  }

  return {
    date,
    totalTeu,
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
    insights,
  };
}

/* ── Monthly Analysis ── */

export function analyzeMonthly(dailyRows: GenericRow[], gateRows: GenericRow[]): MonthlyAnalysis[] {
  const byMonth = new Map<string, GenericRow[]>();
  const gateByMonth = new Map<string, GenericRow[]>();

  for (const row of dailyRows) {
    const d = normalizeDate(row.date_rapport);
    if (!d) continue;
    const m = d.slice(0, 7);
    const arr = byMonth.get(m) ?? [];
    arr.push(row);
    byMonth.set(m, arr);
  }

  for (const row of gateRows) {
    const d = normalizeDate(row.date_rapport);
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

    const totalTeu = toNum(latestRow.total_teu);
    const forecast = toNum(latestRow.total_forecast);
    const realisationPct = toNum(latestRow.taux_realisation_total_pct);
    const avgDailyTeu = avg(rows.map((r) => toNum(r.total_teu)));
    const avgOccupancy = avg(rows.map((r) => toNum(r.taux_occupation_parc)));
    const avgTtt = avg(gRows.map((r) => toNum(r.ttt_duree_minutes)));
    const avgProductivity = avg(rows.map((r) => toNum(r.kpi_net_prod_moy_appareilles)));
    const totalGateMovements = gRows.reduce((s, r) => s + toNum(r.gate_total_mouvements), 0);
    const escalesRealisees = toNum(latestRow.escales_total_realisees);
    const escalesPrevues = toNum(latestRow.escales_total_prevues);

    const prevMonth = i > 0 ? results[i - 1] : null;
    const trendVsPrevious = prevMonth && prevMonth.totalTeu > 0
      ? ((totalTeu - prevMonth.totalTeu) / prevMonth.totalTeu) * 100
      : 0;

    const insights: Insight[] = [];

    if (realisationPct > 0 && realisationPct < 80) {
      insights.push({
        id: `${month}-underperform`,
        level: "warning",
        title: `Sous-performance mensuelle`,
        description: `Realisation ${realisationPct.toFixed(1)}% pour ${month}. Ecart significatif vs budget.`,
        category: "performance",
      });
    }

    if (trendVsPrevious < -15) {
      insights.push({
        id: `${month}-decline`,
        level: "warning",
        title: `Baisse de volume`,
        description: `Volume en baisse de ${Math.abs(trendVsPrevious).toFixed(1)}% vs mois precedent.`,
        category: "trend",
      });
    } else if (trendVsPrevious > 20) {
      insights.push({
        id: `${month}-growth`,
        level: "success",
        title: `Croissance forte`,
        description: `Volume en hausse de ${trendVsPrevious.toFixed(1)}% vs mois precedent.`,
        category: "trend",
      });
    }

    if (avgOccupancy > 90) {
      insights.push({
        id: `${month}-high-occ`,
        level: "warning",
        title: `Occupation parc elevee`,
        description: `Moyenne d'occupation a ${avgOccupancy.toFixed(1)}% sur le mois.`,
        category: "capacity",
      });
    }

    const dateObj = new Date(`${month}-01T00:00:00Z`);
    const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(dateObj);

    results.push({
      month,
      monthLabel,
      totalTeu,
      forecast,
      realisationPct,
      avgDailyTeu,
      avgOccupancy,
      avgTtt,
      avgProductivity,
      totalGateMovements,
      escalesRealisees,
      escalesPrevues,
      daysReported: rows.length,
      trendVsPrevious,
      insights,
    });
  }

  return results;
}

/* ── Annual Analysis ── */

export function analyzeAnnual(monthlyAnalyses: MonthlyAnalysis[]): AnnualAnalysis | null {
  if (!monthlyAnalyses.length) return null;

  const year = Number(monthlyAnalyses[0].month.slice(0, 4));
  const totalTeu = monthlyAnalyses.reduce((s, m) => s + m.totalTeu, 0);
  const avgMonthlyTeu = avg(monthlyAnalyses.map((m) => m.totalTeu));

  const sorted = [...monthlyAnalyses].sort((a, b) => b.totalTeu - a.totalTeu);
  const bestMonth = sorted[0]?.monthLabel ?? "N/A";
  const worstMonth = sorted[sorted.length - 1]?.monthLabel ?? "N/A";

  const avgOccupancy = avg(monthlyAnalyses.map((m) => m.avgOccupancy));
  const avgProductivity = avg(monthlyAnalyses.map((m) => m.avgProductivity));
  const avgTtt = avg(monthlyAnalyses.map((m) => m.avgTtt));
  const totalGateMovements = monthlyAnalyses.reduce((s, m) => s + m.totalGateMovements, 0);

  const growthTrend = monthlyAnalyses.map((m) => m.totalTeu);

  const insights: Insight[] = [];

  // Annual growth trend
  if (monthlyAnalyses.length >= 3) {
    const first3 = avg(monthlyAnalyses.slice(0, 3).map((m) => m.totalTeu));
    const last3 = avg(monthlyAnalyses.slice(-3).map((m) => m.totalTeu));
    const growth = first3 > 0 ? ((last3 - first3) / first3) * 100 : 0;
    if (growth > 10) {
      insights.push({
        id: "annual-growth",
        level: "success",
        title: "Tendance haussiere",
        description: `Croissance de ${growth.toFixed(1)}% entre les 3 premiers et derniers mois.`,
        category: "trend",
      });
    } else if (growth < -10) {
      insights.push({
        id: "annual-decline",
        level: "warning",
        title: "Tendance baissiere",
        description: `Baisse de ${Math.abs(growth).toFixed(1)}% entre les 3 premiers et derniers mois.`,
        category: "trend",
      });
    }
  }

  if (avgOccupancy > 85) {
    insights.push({
      id: "annual-occ",
      level: "warning",
      title: "Pression capacitaire annuelle",
      description: `Occupation moyenne du parc a ${avgOccupancy.toFixed(1)}% sur l'annee. Risque chronique.`,
      category: "capacity",
    });
  }

  return {
    year,
    totalTeu,
    avgMonthlyTeu,
    bestMonth,
    worstMonth,
    avgOccupancy,
    avgProductivity,
    avgTtt,
    totalGateMovements,
    growthTrend,
    months: monthlyAnalyses,
    insights,
  };
}

/* ── Cross Analysis ── */

export function buildCrossAnalysis(
  dailyRows: GenericRow[],
  gateRows: GenericRow[],
  parcRows: GenericRow[],
  performanceRows: GenericRow[],
): CrossAnalysis[] {
  const results: CrossAnalysis[] = [];

  // 1. Volume vs Gate movements
  const volGate: CrossAnalysisPoint[] = [];
  for (const row of dailyRows) {
    const teu = toNum(row.total_teu);
    const gate = toNum(row.gate_total_mouvements);
    if (teu > 0 && gate > 0) {
      volGate.push({ label: normalizeDate(row.date_rapport), x: teu, y: gate });
    }
  }
  if (volGate.length > 5) {
    results.push({
      title: "Volume TEU vs Mouvements Gate",
      xLabel: "Volume TEU",
      yLabel: "Mouvements Gate",
      points: volGate,
      correlation: computeCorrelation(volGate.map((p) => p.x), volGate.map((p) => p.y)),
    });
  }

  // 2. Occupation parc vs Volume
  const occVol: CrossAnalysisPoint[] = [];
  for (const row of dailyRows) {
    const occ = toNum(row.taux_occupation_parc);
    const teu = toNum(row.total_teu);
    if (occ > 0 && teu > 0) {
      occVol.push({ label: normalizeDate(row.date_rapport), x: occ, y: teu });
    }
  }
  if (occVol.length > 5) {
    results.push({
      title: "Occupation Parc vs Volume TEU",
      xLabel: "Taux Occupation (%)",
      yLabel: "Volume TEU",
      points: occVol,
      correlation: computeCorrelation(occVol.map((p) => p.x), occVol.map((p) => p.y)),
    });
  }

  // 3. TTT vs Gate camions
  const tttCam: CrossAnalysisPoint[] = [];
  for (const row of gateRows) {
    const ttt = toNum(row.ttt_duree_minutes);
    const cam = toNum(row.ttt_total_camions);
    if (ttt > 0 && cam > 0) {
      tttCam.push({ label: normalizeDate(row.date_rapport), x: cam, y: ttt });
    }
  }
  if (tttCam.length > 5) {
    results.push({
      title: "Camions Gate vs TTT",
      xLabel: "Nombre de camions",
      yLabel: "TTT (minutes)",
      points: tttCam,
      correlation: computeCorrelation(tttCam.map((p) => p.x), tttCam.map((p) => p.y)),
    });
  }

  // 4. Escales vs Productivite
  const escProd: CrossAnalysisPoint[] = [];
  const perfByDate = new Map<string, { units: number; prod: number; count: number }>();
  for (const row of performanceRows) {
    const d = normalizeDate(row.date_rapport);
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
  if (escProd.length > 5) {
    results.push({
      title: "Escales vs Productivite moyenne",
      xLabel: "Nombre d'escales",
      yLabel: "Productivite (mvts/h)",
      points: escProd,
      correlation: computeCorrelation(escProd.map((p) => p.x), escProd.map((p) => p.y)),
    });
  }

  // 5. Occupation parc vs TTT (maritime congestion correlation)
  const occTtt: CrossAnalysisPoint[] = [];
  for (const row of dailyRows) {
    const occ = toNum(row.taux_occupation_parc);
    const ttt = toNum(row.ttt_duree_minutes);
    if (occ > 0 && ttt > 0) {
      occTtt.push({ label: normalizeDate(row.date_rapport), x: occ, y: ttt });
    }
  }
  if (occTtt.length > 5) {
    results.push({
      title: "Occupation Parc vs TTT",
      xLabel: "Taux Occupation (%)",
      yLabel: "TTT (minutes)",
      points: occTtt,
      correlation: computeCorrelation(occTtt.map((p) => p.x), occTtt.map((p) => p.y)),
    });
  }

  return results;
}

/* ── Correlation ── */

function computeCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 3) return 0;
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

/* ── Intelligence: aggregate all insights ── */

export function generateIntelligence(
  dailyAnalysis: DailyAnalysis | null,
  monthlyAnalyses: MonthlyAnalysis[],
  annualAnalysis: AnnualAnalysis | null,
  crossAnalyses: CrossAnalysis[],
): Insight[] {
  const all: Insight[] = [];

  if (dailyAnalysis) all.push(...dailyAnalysis.insights);

  // Last month insights
  const lastMonth = monthlyAnalyses[monthlyAnalyses.length - 1];
  if (lastMonth) all.push(...lastMonth.insights);

  if (annualAnalysis) all.push(...annualAnalysis.insights);

  // Cross-analysis derived insights
  for (const ca of crossAnalyses) {
    if (Math.abs(ca.correlation) > 0.7) {
      const direction = ca.correlation > 0 ? "positive" : "inverse";
      all.push({
        id: `corr-${ca.title}`,
        level: "info",
        title: `Correlation ${direction} forte`,
        description: `${ca.title}: correlation r=${ca.correlation.toFixed(2)}. Lien ${direction} significatif entre ${ca.xLabel} et ${ca.yLabel}.`,
        category: "trend",
      });
    }
  }

  // Sort by severity
  const order: Record<InsightLevel, number> = { critical: 0, warning: 1, info: 2, success: 3 };
  return all.sort((a, b) => order[a.level] - order[b.level]);
}
