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
export * from "./dashboard-metrics-5";
import { GenericRow, FilterOptions, InitialData, BulletinMonthRow, Cumul2026MonthRow, ShippingMonthRow, WeekdayHeatmapRow, CompletedCall, CapacityAlert, CorrelationStudyRow, GuideSection, FLOW_COLORS, WEEKDAY_ORDER, DAILY_REFRESH_HOUR, toNumber, toText, sanitizeDateText, formatChartExportLabel, buildVisibleChartLabel, renderExportPieValueLabel, filterRowsSinceYearStart, buildParcTrendRows, formatInteger, formatPercent, formatSignedInteger, formatMinutes, formatDateLabel, formatDateTimeLabel, formatShortDate, normalizeDateValue, resolveRowDate, getWeekdayName, formatRowDate, getLatestDateFromRows, filterRowsByDate, getLatestRows, getLatestReportRow, formatMonthAxisLabel, buildDateJoinKey, getDateBounds, derivePleinsTeu, parseLoaMeters, getLoaBucket, parsePortEventDate, parseEtcEstimate, getHoursBetween, formatHours, formatDateTimeCompact, buildCompletedCallKey, buildCompletedCalls, buildCompletedCallShippingMonthlyRows, buildCompletedCallShippingStats, buildCompletedCallLoaStats, buildMonthlyTrafficRows, buildMonthlyCycleRows, buildMonthlyProductivityByShipping, buildMonthlyProductivityByLoa, computePearsonCorrelation, describeCorrelationStrength, getCorrelationWarning, buildCongestionVsOccupationRows, buildMonthlyQuayVsProductivityRows, buildWaitingCountVsCongestionRateRows, buildCapacityAlerts, isJustInTime, getProductivityAppreciation, buildActiveOperationPredictions, buildServiceRecap, buildWeekdayAverages, buildPortFocus, buildExploitantsBreakdown, buildParkFamilyMix, buildFlowMix, buildArmateurProgress, buildArmateurEscalesPie, buildShippingPerformance, getShippingBucket, buildYardLineRows, buildSituationEscaleRows, buildCumul2026MonthlyRows, buildCumul2026ShippingRows, buildYearWeekdayHeatmapRows } from "./dashboard-metrics-5";

export function buildMonthlyBulletin(dailyRows: GenericRow[], gateRows: GenericRow[]): BulletinMonthRow[] {
  const gateByDate = new Map<string, GenericRow>();
  for (const row of gateRows) {
    const joinKey = buildDateJoinKey(row);
    if (joinKey) gateByDate.set(joinKey, row);
  }

  const monthMap = new Map<string, {
    latestDaily: GenericRow | null; latestTime: number;
    gateCamionsSum: number; gateMovementsSum: number;
    entreesPleinsSum: number; entreesVidesSum: number;
    sortiesPleinsSum: number; sortiesVidesSum: number;
    tttSum: number; occupationSum: number; reefersSum: number;
    escalesRateSum: number; utilisationSum: number; productivitySum: number; dayCount: number;
  }>();

  for (const row of dailyRows) {
    const dateText = normalizeDateValue(resolveRowDate(row));
    const monthKey = dateText ? dateText.slice(0, 7) : "";
    if (!monthKey) continue;
    const currentTime = Date.parse(dateText);
    const gate = gateByDate.get(buildDateJoinKey(row)) ?? {};
    const entry = monthMap.get(monthKey) ?? {
      latestDaily: null, latestTime: -Infinity,
      gateCamionsSum: 0, gateMovementsSum: 0,
      entreesPleinsSum: 0, entreesVidesSum: 0,
      sortiesPleinsSum: 0, sortiesVidesSum: 0,
      tttSum: 0, occupationSum: 0, reefersSum: 0,
      escalesRateSum: 0, utilisationSum: 0, productivitySum: 0, dayCount: 0,
    };
    if (currentTime >= entry.latestTime) { entry.latestDaily = row; entry.latestTime = currentTime; }
    entry.gateCamionsSum += toNumber(gate.ttt_total_camions || row.ttt_total_camions);
    entry.gateMovementsSum += toNumber(gate.gate_total_mouvements || row.gate_total_mouvements);
    entry.entreesPleinsSum += toNumber(gate.gate_entrees_pleins || row.gate_entrees_pleins);
    entry.entreesVidesSum += toNumber(gate.gate_entrees_vides || row.gate_entrees_vides);
    entry.sortiesPleinsSum += toNumber(gate.gate_sorties_pleins || row.gate_sorties_pleins);
    entry.sortiesVidesSum += toNumber(gate.gate_sorties_vides || row.gate_sorties_vides);
    entry.tttSum += toNumber(gate.ttt_duree_minutes || row.ttt_duree_minutes);
    entry.occupationSum += toNumber(row.taux_occupation_parc);
    entry.reefersSum += toNumber(row.taux_occupation_reefers);
    entry.escalesRateSum += toNumber(row.taux_realisation_escales_pct);
    entry.utilisationSum += toNumber(row.kpi_utilisation_globale_pct);
    entry.productivitySum += toNumber(row.kpi_net_prod_moy_appareilles);
    entry.dayCount += 1;
    monthMap.set(monthKey, entry);
  }

  return Array.from(monthMap.entries())
    .map(([anneeMois, entry]) => {
      const latestDaily = entry.latestDaily ?? {};
      const dayCount = Math.max(entry.dayCount, 1);
      const latestDate = normalizeDateValue(resolveRowDate(latestDaily));
      const dateObj = latestDate ? new Date(`${latestDate}T00:00:00Z`) : new Date(`${anneeMois}-01T00:00:00Z`);
      return {
        anneeMois,
        annee: Number(anneeMois.slice(0, 4)) || toNumber(latestDaily.annee),
        moisLabel: new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: "UTC" }).format(dateObj),
        realized: toNumber(latestDaily.total_teu),
        budget: toNumber(latestDaily.total_forecast),
        importTeu: toNumber(latestDaily.import_teu),
        exportTeu: toNumber(latestDaily.export_teu),
        transboTeu: toNumber(latestDaily.transbo_teu),
        videsTeu: toNumber(latestDaily.vides_teu),
        gateCamionsSum: entry.gateCamionsSum,
        gateMovementsSum: entry.gateMovementsSum,
        entreesPleinsSum: entry.entreesPleinsSum,
        entreesVidesSum: entry.entreesVidesSum,
        sortiesPleinsSum: entry.sortiesPleinsSum,
        sortiesVidesSum: entry.sortiesVidesSum,
        tttAverage: entry.tttSum / dayCount,
        occupationAverage: entry.occupationSum / dayCount,
        reefersAverage: entry.reefersSum / dayCount,
        escalesRateAverage: entry.escalesRateSum / dayCount,
        utilisationAverage: entry.utilisationSum / dayCount,
        productivityAverage: entry.productivitySum / dayCount,
        latestDate,
      };
    })
    .sort((a, b) => a.anneeMois.localeCompare(b.anneeMois));
}
