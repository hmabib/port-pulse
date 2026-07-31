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
export * from "./dashboard-metrics-4";
import { GenericRow, FilterOptions, InitialData, BulletinMonthRow, Cumul2026MonthRow, ShippingMonthRow, WeekdayHeatmapRow, CompletedCall, CapacityAlert, CorrelationStudyRow, GuideSection, FLOW_COLORS, WEEKDAY_ORDER, DAILY_REFRESH_HOUR, toNumber, toText, sanitizeDateText, formatChartExportLabel, buildVisibleChartLabel, renderExportPieValueLabel, filterRowsSinceYearStart, buildParcTrendRows, formatInteger, formatPercent, formatSignedInteger, formatMinutes, formatDateLabel, formatDateTimeLabel, formatShortDate, normalizeDateValue, resolveRowDate, getWeekdayName, formatRowDate, getLatestDateFromRows, filterRowsByDate, getLatestRows, getLatestReportRow, formatMonthAxisLabel, buildDateJoinKey, getDateBounds, derivePleinsTeu, parseLoaMeters, getLoaBucket, parsePortEventDate, parseEtcEstimate, getHoursBetween, formatHours, formatDateTimeCompact, buildCompletedCallKey, buildCompletedCalls, buildCompletedCallShippingMonthlyRows, buildCompletedCallShippingStats, buildCompletedCallLoaStats, buildMonthlyTrafficRows, buildMonthlyCycleRows, buildMonthlyProductivityByShipping, buildMonthlyProductivityByLoa, computePearsonCorrelation, describeCorrelationStrength, getCorrelationWarning, buildCongestionVsOccupationRows, buildMonthlyQuayVsProductivityRows, buildWaitingCountVsCongestionRateRows, buildCapacityAlerts, isJustInTime, getProductivityAppreciation, buildActiveOperationPredictions, buildServiceRecap, buildWeekdayAverages, buildPortFocus, buildExploitantsBreakdown, buildParkFamilyMix, buildFlowMix, buildArmateurProgress, buildArmateurEscalesPie, buildShippingPerformance, getShippingBucket, buildYardLineRows } from "./dashboard-metrics-4";

export function buildSituationEscaleRows(rows: GenericRow[]) {
  return rows
    .map((row) => ({
      ...row,
      totalFluxTeu:
        toNumber(row.import_total_teu) +
        toNumber(row.export_total_teu) +
        toNumber(row.transbo_total_teu),
    }))
    .sort((a, b) => toNumber(b.totalFluxTeu) - toNumber(a.totalFluxTeu));
}

export function buildCumul2026MonthlyRows(
  dailyRows: GenericRow[],
  gateRows: GenericRow[],
  performanceRows: GenericRow[],
  armateurRows: GenericRow[],
  targetYear: number,
): Cumul2026MonthRow[] {
  // Group daily rows by month
  const dailyByMonth = new Map<string, GenericRow[]>();
  for (const row of dailyRows) {
    const date = normalizeDateValue(resolveRowDate(row));
    if (!date.startsWith(`${targetYear}-`)) continue;
    const monthKey = date.slice(0, 7);
    const arr = dailyByMonth.get(monthKey) ?? [];
    arr.push(row);
    dailyByMonth.set(monthKey, arr);
  }

  // Group gate rows by month (for TTT/camions averages from gate table)
  const gateByMonth = new Map<string, GenericRow[]>();
  for (const row of gateRows) {
    const date = normalizeDateValue(resolveRowDate(row));
    if (!date.startsWith(`${targetYear}-`)) continue;
    const monthKey = date.slice(0, 7);
    const arr = gateByMonth.get(monthKey) ?? [];
    arr.push(row);
    gateByMonth.set(monthKey, arr);
  }

  const armateursByMonth = new Map<string, GenericRow[]>();
  for (const row of armateurRows) {
    const date = normalizeDateValue(resolveRowDate(row));
    if (!date.startsWith(`${targetYear}-`)) continue;
    const monthKey = date.slice(0, 7);
    const arr = armateursByMonth.get(monthKey) ?? [];
    arr.push(row);
    armateursByMonth.set(monthKey, arr);
  }

  // Productivity averages from performance rows
  const prodByMonth = new Map<string, { prodSum: number; count: number }>();
  for (const row of performanceRows) {
    const date = normalizeDateValue(resolveRowDate(row));
    if (!date.startsWith(`${targetYear}-`)) continue;
    const monthKey = date.slice(0, 7);
    const entry = prodByMonth.get(monthKey) ?? { prodSum: 0, count: 0 };
    entry.prodSum += toNumber(row.net_prod);
    entry.count += 1;
    prodByMonth.set(monthKey, entry);
  }

  const armateursMaxByMonth = new Map<string, number>();
  for (const [monthKey, rows] of armateursByMonth.entries()) {
    let maxEscales = 0;
    for (const row of rows) {
      maxEscales = Math.max(maxEscales, toNumber(row.escales_total_realisees));
    }
    armateursMaxByMonth.set(monthKey, maxEscales);
  }

  const dailyMaxByMonth = new Map<string, {
    importTeu: number;
    exportTeu: number;
    transboTeu: number;
    pleinsTeu: number;
    videsTeu: number;
    totalTeu: number;
    totalForecast: number;
  }>();
  for (const row of dailyRows) {
    const date = normalizeDateValue(resolveRowDate(row));
    if (!date.startsWith(`${targetYear}-`)) continue;
    const monthKey = date.slice(0, 7);
    const entry = dailyMaxByMonth.get(monthKey) ?? {
      importTeu: 0,
      exportTeu: 0,
      transboTeu: 0,
      pleinsTeu: 0,
      videsTeu: 0,
      totalTeu: 0,
      totalForecast: 0,
    };
    entry.importTeu = Math.max(entry.importTeu, toNumber(row.import_teu));
    entry.exportTeu = Math.max(entry.exportTeu, toNumber(row.export_teu));
    entry.transboTeu = Math.max(entry.transboTeu, toNumber(row.transbo_teu));
    entry.pleinsTeu = Math.max(entry.pleinsTeu, derivePleinsTeu(row));
    entry.videsTeu = Math.max(entry.videsTeu, toNumber(row.vides_teu));
    entry.totalTeu = Math.max(entry.totalTeu, toNumber(row.total_teu));
    entry.totalForecast = Math.max(entry.totalForecast, toNumber(row.total_forecast));
    dailyMaxByMonth.set(monthKey, entry);
  }

  const monthKeys = Array.from(
    new Set([
      ...dailyByMonth.keys(),
      ...gateByMonth.keys(),
      ...prodByMonth.keys(),
      ...dailyMaxByMonth.keys(),
      ...armateursByMonth.keys(),
    ]),
  ).sort();

  return monthKeys
    .map((anneeMois) => {
      const rows = dailyByMonth.get(anneeMois) ?? [];
      // Last day of month = cumul values (TEU, forecast, realisation)
      const sorted = [...rows].sort((a, b) =>
        normalizeDateValue(resolveRowDate(a)).localeCompare(normalizeDateValue(resolveRowDate(b))),
      );

      // Daily averages from daily rows (exclude days with 0 mouvements = inactive)
      const allDays = sorted.length;
      const occupancyDayCount = Math.max(allDays, 1);

      let occSum = 0, reefSum = 0;
      for (const r of sorted) { occSum += toNumber(r.taux_occupation_parc); reefSum += toNumber(r.taux_occupation_reefers); }

      // Gate averages from gate table (more reliable for TTT)
      const gateMonth = gateByMonth.get(anneeMois) ?? [];
      const activeGate = gateMonth.filter((r) => toNumber(r.ttt_total_camions) > 0);
      const gateDayCount = gateMonth.length;
      const gateAverageDayCount = Math.max(activeGate.length || gateDayCount, 1);

      let tttSum = 0, camionsSum = 0, epSum = 0, evSum = 0, spSum = 0, svSum = 0, mvtSum = 0;
      for (const r of gateMonth) {
        tttSum += toNumber(r.ttt_duree_minutes);
        camionsSum += toNumber(r.ttt_total_camions);
        epSum += toNumber(r.gate_entrees_pleins);
        evSum += toNumber(r.gate_entrees_vides);
        spSum += toNumber(r.gate_sorties_pleins);
        svSum += toNumber(r.gate_sorties_vides);
        mvtSum += toNumber(r.gate_total_mouvements);
      }

      const prod = prodByMonth.get(anneeMois) ?? { prodSum: 0, count: 0 };
      const dailyMax = dailyMaxByMonth.get(anneeMois) ?? {
        importTeu: 0,
        exportTeu: 0,
        transboTeu: 0,
        pleinsTeu: 0,
        videsTeu: 0,
        totalTeu: 0,
        totalForecast: 0,
      };
      const latestDateCandidates = [
        ...sorted.map((row) => normalizeDateValue(resolveRowDate(row))),
        ...gateMonth.map((row) => normalizeDateValue(resolveRowDate(row))),
        ...(armateursByMonth.get(anneeMois) ?? []).map((row) => normalizeDateValue(resolveRowDate(row))),
      ]
        .filter(Boolean)
        .sort();
      const latestDate = latestDateCandidates[latestDateCandidates.length - 1] ?? `${anneeMois}-01`;
      const dateObj = new Date(`${anneeMois}-01T00:00:00Z`);
      const moisLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: "UTC" }).format(dateObj);

      return {
        anneeMois,
        moisLabel,
        latestDate,
        nbJours: allDays,
        gateDayCount,
        occupancyDayCount: allDays,
        productivityCount: prod.count,
        tttObservedDays: activeGate.length,
        // Cumuls = maximum monthly cumulative reached on any bulletin in the month
        totalTeu: dailyMax.totalTeu,
        importTeu: dailyMax.importTeu,
        exportTeu: dailyMax.exportTeu,
        transboTeu: dailyMax.transboTeu,
        pleinsTeu: dailyMax.pleinsTeu,
        videsTeu: dailyMax.videsTeu,
        totalForecast: dailyMax.totalForecast,
        tauxRealisation: dailyMax.totalForecast > 0 ? (dailyMax.totalTeu / dailyMax.totalForecast) * 100 : 0,
        escalesRealisees: armateursMaxByMonth.get(anneeMois) ?? 0,
        // Averages across month
        occupationAvg: occSum / occupancyDayCount,
        reefersAvg: reefSum / occupancyDayCount,
        gateAverageDayCount,
        tttAvg: tttSum / gateAverageDayCount,
        camionsAvgJour: camionsSum / gateAverageDayCount,
        mouvementsAvgJour: mvtSum / gateAverageDayCount,
        entreesTotalAvgJour: (epSum + evSum) / gateAverageDayCount,
        sortiesPleinAvgJour: spSum / gateAverageDayCount,
        sortiesVideAvgJour: svSum / gateAverageDayCount,
        sortiesTotalAvgJour: (spSum + svSum) / gateAverageDayCount,
        entreesPleinAvgJour: epSum / gateAverageDayCount,
        entreesVideAvgJour: evSum / gateAverageDayCount,
        productivityAverage: prod.count ? prod.prodSum / prod.count : 0,
        // Cumuls gate
        gateEntreesPleins: epSum,
        gateEntreesVides: evSum,
        gateSortiesPleins: spSum,
        gateSortiesVides: svSum,
        totalCamions: camionsSum,
      };
    });
}

export function buildCumul2026ShippingRows(rows: GenericRow[], targetYear: number): ShippingMonthRow[] {
  const monthMap = new Map<string, { moisLabel: string; shipping: string; escales: number; units: number; prodSum: number; prodCount: number }>();

  for (const row of rows) {
    const date = normalizeDateValue(resolveRowDate(row));
    if (!date.startsWith(`${targetYear}-`)) continue;
    const anneeMois = date.slice(0, 7);
    const dateObj = new Date(`${anneeMois}-01T00:00:00Z`);
    const moisLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: "UTC" }).format(dateObj);
    const shippingOption = getShippingOption(toText(row.shipping, "Non renseignee"));
    const shipping = shippingOption.label;
    const key = `${anneeMois}|${shippingOption.value}`;
    const entry = monthMap.get(key) ?? { moisLabel, shipping, escales: 0, units: 0, prodSum: 0, prodCount: 0 };
    entry.escales += 1;
    entry.units += toNumber(row.t_units);
    entry.prodSum += toNumber(row.net_prod);
    entry.prodCount += 1;
    monthMap.set(key, entry);
  }

  return Array.from(monthMap.entries())
    .map(([key, entry]) => {
      const [anneeMois] = key.split("|");
      return {
        anneeMois,
        moisLabel: entry.moisLabel,
        shipping: entry.shipping,
        escales: entry.escales,
        units: entry.units,
        productivity: entry.prodCount ? entry.prodSum / entry.prodCount : 0,
      };
    })
    .sort((a, b) => a.anneeMois.localeCompare(b.anneeMois) || b.escales - a.escales);
}

export function buildYearWeekdayHeatmapRows(rows: GenericRow[], targetYear: number): WeekdayHeatmapRow[] {
  const map = new Map<string, { dayName: string; tttSum: number; camionsSum: number; count: number }>();
  for (const row of rows) {
    const date = resolveRowDate(row);
    if (!date.startsWith(String(targetYear))) continue;
    const dayName = getWeekdayName(date);
    const entry = map.get(dayName) ?? { dayName, tttSum: 0, camionsSum: 0, count: 0 };
    entry.tttSum += toNumber(row.ttt_duree_minutes);
    entry.camionsSum += toNumber(row.ttt_total_camions);
    entry.count += 1;
    map.set(dayName, entry);
  }

  return Array.from(map.values())
    .map((entry) => ({
      dayName: entry.dayName,
      tttAverage: entry.count ? entry.tttSum / entry.count : 0,
      camionsAverage: entry.count ? entry.camionsSum / entry.count : 0,
    }))
    .sort((a, b) => WEEKDAY_ORDER.indexOf(a.dayName) - WEEKDAY_ORDER.indexOf(b.dayName));
}
