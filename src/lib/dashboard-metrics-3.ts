/* eslint-disable @typescript-eslint/no-unused-vars */
import { getShippingOption } from "@/lib/shipping";
import type { ShippingOption } from "@/lib/shipping";
import {
  ETC_MODEL,
  INTELLIGENCE_THRESHOLDS,
  hasSufficientPearsonSample,
} from "@/lib/intelligence-config";
import {
  guardLoaMeters,
  loaBucket as qualityLoaBucket,
  parseBulletinTimestampOrNull,
  strictValueOf,
} from "@/lib/data-quality";
export * from "./dashboard-metrics-2";
import { GenericRow, FilterOptions, InitialData, BulletinMonthRow, Cumul2026MonthRow, ShippingMonthRow, WeekdayHeatmapRow, CompletedCall, CapacityAlert, CorrelationStudyRow, GuideSection, FLOW_COLORS, WEEKDAY_ORDER, DAILY_REFRESH_HOUR, toNumber, toText, sanitizeDateText, formatChartExportLabel, buildVisibleChartLabel, renderExportPieValueLabel, filterRowsSinceYearStart, buildParcTrendRows, formatInteger, formatPercent, formatSignedInteger, formatMinutes, formatDateLabel, formatDateTimeLabel, formatShortDate, normalizeDateValue, resolveRowDate, getWeekdayName, formatRowDate, getLatestDateFromRows, filterRowsByDate, getLatestRows, getLatestReportRow, formatMonthAxisLabel, buildDateJoinKey, getDateBounds, derivePleinsTeu, parseLoaMeters, getLoaBucket, parsePortEventDate, parseEtcEstimate, getHoursBetween, formatHours, formatDateTimeCompact, buildCompletedCallKey, buildCompletedCalls, buildCompletedCallShippingMonthlyRows, buildCompletedCallShippingStats, buildCompletedCallLoaStats, buildMonthlyTrafficRows } from "./dashboard-metrics-2";

export function buildMonthlyCycleRows(calls: CompletedCall[]) {
  const map = new Map<string, { anneeMois: string; moisLabel: string; escales: number; waitSum: number; opSum: number; postSum: number; quaySum: number; totalSum: number }>();
  for (const call of calls) {
    const date = new Date(`${call.monthKey}-01T00:00:00Z`);
    const moisLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: "UTC" }).format(date);
    const entry = map.get(call.monthKey) ?? { anneeMois: call.monthKey, moisLabel, escales: 0, waitSum: 0, opSum: 0, postSum: 0, quaySum: 0, totalSum: 0 };
    entry.escales += 1;
    entry.waitSum += call.waitHours;
    entry.opSum += call.operationHours;
    entry.postSum += call.postOpsHours;
    entry.quaySum += call.quayHours;
    entry.totalSum += call.totalCycleHours;
    map.set(call.monthKey, entry);
  }
  return Array.from(map.values())
    .map((entry) => ({
      anneeMois: entry.anneeMois,
      moisLabel: entry.moisLabel,
      escales: entry.escales,
      waitHours: entry.escales ? entry.waitSum / entry.escales : 0,
      operationHours: entry.escales ? entry.opSum / entry.escales : 0,
      postOpsHours: entry.escales ? entry.postSum / entry.escales : 0,
      quayHours: entry.escales ? entry.quaySum / entry.escales : 0,
      totalCycleHours: entry.escales ? entry.totalSum / entry.escales : 0,
    }))
    .sort((a, b) => a.anneeMois.localeCompare(b.anneeMois));
}

export function buildMonthlyProductivityByShipping(calls: CompletedCall[], limit = 5) {
  const shippingRank = buildCompletedCallShippingStats(calls)
    .slice(0, limit)
    .map((row) => row.shipping);
  const monthMap = new Map<string, Record<string, unknown>>();
  for (const call of calls) {
    if (!shippingRank.includes(call.shipping)) continue;
    const date = new Date(`${call.monthKey}-01T00:00:00Z`);
    const moisLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: "UTC" }).format(date);
    const existing = monthMap.get(call.monthKey) ?? { anneeMois: call.monthKey, moisLabel };
    const sumKey = `${call.shipping}__sum`;
    const countKey = `${call.shipping}__count`;
    existing[sumKey] = toNumber(existing[sumKey]) + call.productivity;
    existing[countKey] = toNumber(existing[countKey]) + 1;
    monthMap.set(call.monthKey, existing);
  }
  const rows = Array.from(monthMap.values())
    .sort((a, b) => toText(a.anneeMois, "").localeCompare(toText(b.anneeMois, "")))
    .map((row) => {
      const nextRow: Record<string, unknown> = { anneeMois: row.anneeMois, moisLabel: row.moisLabel };
      for (const shipping of shippingRank) {
        const sum = toNumber(row[`${shipping}__sum`]);
        const count = toNumber(row[`${shipping}__count`]);
        nextRow[shipping] = count > 0 ? sum / count : 0;
      }
      return nextRow;
    });
  return { rows, series: shippingRank };
}

export function buildMonthlyProductivityByLoa(calls: CompletedCall[]) {
  const loaOrder = ["< 200m", "200-249m", "250-299m", "300-349m", ">= 350m", "LOA inconnue"];
  const monthMap = new Map<string, Record<string, unknown>>();
  for (const call of calls) {
    const date = new Date(`${call.monthKey}-01T00:00:00Z`);
    const moisLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: "UTC" }).format(date);
    const existing = monthMap.get(call.monthKey) ?? { anneeMois: call.monthKey, moisLabel };
    const sumKey = `${call.loaBucket}__sum`;
    const countKey = `${call.loaBucket}__count`;
    existing[sumKey] = toNumber(existing[sumKey]) + call.productivity;
    existing[countKey] = toNumber(existing[countKey]) + 1;
    monthMap.set(call.monthKey, existing);
  }
  const rows = Array.from(monthMap.values())
    .sort((a, b) => toText(a.anneeMois, "").localeCompare(toText(b.anneeMois, "")))
    .map((row) => {
      const nextRow: Record<string, unknown> = { anneeMois: row.anneeMois, moisLabel: row.moisLabel };
      for (const loaBucket of loaOrder) {
        const sum = toNumber(row[`${loaBucket}__sum`]);
        const count = toNumber(row[`${loaBucket}__count`]);
        nextRow[loaBucket] = count > 0 ? sum / count : 0;
      }
      return nextRow;
    });
  return { rows, series: loaOrder };
}

export function computePearsonCorrelation(points: Array<{ x: number; y: number }>) {
  const valid = points.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  if (!hasSufficientPearsonSample(valid.length)) return 0;
  const meanX = valid.reduce((sum, point) => sum + point.x, 0) / valid.length;
  const meanY = valid.reduce((sum, point) => sum + point.y, 0) / valid.length;
  let numerator = 0;
  let sumSqX = 0;
  let sumSqY = 0;
  for (const point of valid) {
    const dx = point.x - meanX;
    const dy = point.y - meanY;
    numerator += dx * dy;
    sumSqX += dx * dx;
    sumSqY += dy * dy;
  }
  const denominator = Math.sqrt(sumSqX * sumSqY);
  if (!denominator) return 0;
  return numerator / denominator;
}

export function describeCorrelationStrength(value: number) {
  const abs = Math.abs(value);
  if (abs >= 0.7) return "forte";
  if (abs >= 0.4) return "moderee";
  return "faible";
}

export function getCorrelationWarning(sampleSize: number): string | null {
  if (hasSufficientPearsonSample(sampleSize)) return null;
  return `Echantillon insuffisant: ${sampleSize} point(s), minimum ${INTELLIGENCE_THRESHOLDS.pearsonMinPoints}.`;
}

export function buildCongestionVsOccupationRows(calls: CompletedCall[], monthlyRows: Cumul2026MonthRow[], threshold: number): CorrelationStudyRow[] {
  const callMap = new Map<string, { count: number; congestedCount: number; congestedWaitSum: number }>();
  for (const call of calls) {
    const entry = callMap.get(call.monthKey) ?? { count: 0, congestedCount: 0, congestedWaitSum: 0 };
    entry.count += 1;
    if (call.waitHours >= threshold) {
      entry.congestedCount += 1;
      entry.congestedWaitSum += call.waitHours;
    }
    callMap.set(call.monthKey, entry);
  }
  return monthlyRows
    .map((row) => {
      const stats = callMap.get(row.anneeMois);
      const waitingCount = stats?.congestedCount ?? 0;
      const avgCongestionHours = waitingCount > 0 ? (stats?.congestedWaitSum ?? 0) / waitingCount : 0;
      const congestionRate = (stats?.count ?? 0) > 0 ? (waitingCount / (stats?.count ?? 1)) * 100 : 0;
      return {
        anneeMois: row.anneeMois,
        moisLabel: row.moisLabel,
        x: avgCongestionHours,
        y: row.occupationAvg,
        waitingCount,
        congestionRate,
        occupancyAvg: row.occupationAvg,
        avgCongestionHours,
      };
    })
    .filter((row) => row.occupancyAvg && row.avgCongestionHours && row.avgCongestionHours > 0);
}

export function buildMonthlyQuayVsProductivityRows(calls: CompletedCall[]): CorrelationStudyRow[] {
  const map = new Map<string, { moisLabel: string; count: number; quaySum: number; prodSum: number }>();
  for (const call of calls) {
    const date = new Date(`${call.monthKey}-01T00:00:00Z`);
    const moisLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: "UTC" }).format(date);
    const entry = map.get(call.monthKey) ?? { moisLabel, count: 0, quaySum: 0, prodSum: 0 };
    entry.count += 1;
    entry.quaySum += call.quayHours;
    entry.prodSum += call.productivity;
    map.set(call.monthKey, entry);
  }
  return Array.from(map.entries())
    .map(([anneeMois, entry]) => ({
      anneeMois,
      moisLabel: entry.moisLabel,
      x: entry.count > 0 ? entry.quaySum / entry.count : 0,
      y: entry.count > 0 ? entry.prodSum / entry.count : 0,
      quayHours: entry.count > 0 ? entry.quaySum / entry.count : 0,
      productivity: entry.count > 0 ? entry.prodSum / entry.count : 0,
    }))
    .filter((row) => row.quayHours && row.productivity)
    .sort((a, b) => a.anneeMois.localeCompare(b.anneeMois));
}

export function buildWaitingCountVsCongestionRateRows(calls: CompletedCall[], threshold: number): CorrelationStudyRow[] {
  const map = new Map<string, { moisLabel: string; count: number; waitingCount: number }>();
  for (const call of calls) {
    const date = new Date(`${call.monthKey}-01T00:00:00Z`);
    const moisLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: "UTC" }).format(date);
    const entry = map.get(call.monthKey) ?? { moisLabel, count: 0, waitingCount: 0 };
    entry.count += 1;
    if (call.waitHours >= threshold) entry.waitingCount += 1;
    map.set(call.monthKey, entry);
  }
  return Array.from(map.entries())
    .map(([anneeMois, entry]) => ({
      anneeMois,
      moisLabel: entry.moisLabel,
      x: entry.waitingCount,
      y: entry.count > 0 ? (entry.waitingCount / entry.count) * 100 : 0,
      waitingCount: entry.waitingCount,
      congestionRate: entry.count > 0 ? (entry.waitingCount / entry.count) * 100 : 0,
    }))
    .filter((row) => toNumber(row.waitingCount) > 0)
    .sort((a, b) => a.anneeMois.localeCompare(b.anneeMois));
}

export function buildCapacityAlerts(
  predictions: GenericRow[],
  expectedRows: GenericRow[],
  parcRow: GenericRow,
): CapacityAlert[] {
  const alerts: CapacityAlert[] = [];
  const availableSlots = toNumber(parcRow.parc_conteneurs_disponible);
  const activeRemainingUnits = predictions.reduce((sum, row) => sum + toNumber(row.rem_units), 0);
  const expectedUnits = expectedRows.reduce((sum, row) => sum + toNumber(row.t_units_prevu), 0);

  if (activeRemainingUnits > availableSlots) {
    alerts.push({
      id: "active-over-capacity",
      level: "critical",
      title: "Reste a decharger superieur a la capacite disponible",
      description: `${formatInteger(activeRemainingUnits)} units restent a traiter pour ${formatInteger(availableSlots)} places disponibles sur le terminal.`,
    });
  }

  if (expectedUnits > availableSlots) {
    alerts.push({
      id: "expected-over-capacity",
      level: "warning",
      title: "Navires attendus au-dessus de la capacite disponible",
      description: `${formatInteger(expectedUnits)} units attendues pour ${formatInteger(availableSlots)} places disponibles. Risque de saturation a l'arrivee.`,
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: "capacity-ok",
      level: "info",
      title: "Capacite terminal compatible avec les volumes a recevoir",
      description: `${formatInteger(availableSlots)} places disponibles pour ${formatInteger(activeRemainingUnits + expectedUnits)} units restantes et attendues.`,
    });
  }

  return alerts;
}

export function isJustInTime(row: GenericRow) {
  const projectedCompletion = row.projectedCompletion instanceof Date ? row.projectedCompletion : null;
  const etcBulletin = row.etcBulletin instanceof Date ? row.etcBulletin : null;
  if (!projectedCompletion || !etcBulletin) return false;
  return projectedCompletion.getTime() <= etcBulletin.getTime();
}

export function getProductivityAppreciation(row: GenericRow) {
  const observed = toNumber(row.observedProd ?? row.net_prod);
  const modeled = toNumber(row.modeledProd);
  if (observed <= 0) {
    return {
      label: "Indetermine",
      arrow: "→",
      className: "bg-slate-500/15 text-slate-300",
    };
  }
  if (modeled > 0) {
    if (observed >= modeled * (1 + INTELLIGENCE_THRESHOLDS.productivityModelToleranceRatio)) {
      return {
        label: "Positive",
        arrow: "↑",
        className: "bg-emerald-500/15 text-emerald-400",
      };
    }
    if (observed <= modeled * (1 - INTELLIGENCE_THRESHOLDS.productivityModelToleranceRatio)) {
      return {
        label: "Negative",
        arrow: "↓",
        className: "bg-rose-500/15 text-rose-400",
      };
    }
  }
  return {
    label: "Conforme",
    arrow: "→",
    className: "bg-sky-500/15 text-sky-400",
  };
}
