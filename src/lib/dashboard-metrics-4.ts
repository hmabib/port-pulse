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
export * from "./dashboard-metrics-3";
import { GenericRow, FilterOptions, InitialData, BulletinMonthRow, Cumul2026MonthRow, ShippingMonthRow, WeekdayHeatmapRow, CompletedCall, CapacityAlert, CorrelationStudyRow, GuideSection, FLOW_COLORS, WEEKDAY_ORDER, DAILY_REFRESH_HOUR, toNumber, toText, sanitizeDateText, formatChartExportLabel, buildVisibleChartLabel, renderExportPieValueLabel, filterRowsSinceYearStart, buildParcTrendRows, formatInteger, formatPercent, formatSignedInteger, formatMinutes, formatDateLabel, formatDateTimeLabel, formatShortDate, normalizeDateValue, resolveRowDate, getWeekdayName, formatRowDate, getLatestDateFromRows, filterRowsByDate, getLatestRows, getLatestReportRow, formatMonthAxisLabel, buildDateJoinKey, getDateBounds, derivePleinsTeu, parseLoaMeters, getLoaBucket, parsePortEventDate, parseEtcEstimate, getHoursBetween, formatHours, formatDateTimeCompact, buildCompletedCallKey, buildCompletedCalls, buildCompletedCallShippingMonthlyRows, buildCompletedCallShippingStats, buildCompletedCallLoaStats, buildMonthlyTrafficRows, buildMonthlyCycleRows, buildMonthlyProductivityByShipping, buildMonthlyProductivityByLoa, computePearsonCorrelation, describeCorrelationStrength, getCorrelationWarning, buildCongestionVsOccupationRows, buildMonthlyQuayVsProductivityRows, buildWaitingCountVsCongestionRateRows, buildCapacityAlerts, isJustInTime, getProductivityAppreciation } from "./dashboard-metrics-3";

export function buildActiveOperationPredictions(rows: GenericRow[], reportRow: GenericRow, completedCalls: CompletedCall[]) {
  const reportDate = normalizeDateValue(resolveRowDate(reportRow)) || normalizeDateValue(resolveRowDate(rows[0] ?? {}));
  const referenceDate =
    parsePortEventDate(reportRow.created_at, reportDate) ||
    (toNumber(reportRow.created_timestamp) > 0 ? new Date(toNumber(reportRow.created_timestamp) * 1000) : null) ||
    parsePortEventDate(`${reportDate} 23:59`, reportDate) ||
    new Date();

  const histByKey = new Map<string, { prodSum: number; count: number; postOpsSum: number; postOpsCount: number }>();
  for (const call of completedCalls) {
    const bucket = `${call.shipping}|${call.loaBucket}`;
    const entry = histByKey.get(bucket) ?? { prodSum: 0, count: 0, postOpsSum: 0, postOpsCount: 0 };
    if (call.productivity > 0) {
      entry.prodSum += call.productivity;
      entry.count += 1;
    }
    if (call.postOpsHours > 0) {
      entry.postOpsSum += call.postOpsHours;
      entry.postOpsCount += 1;
    }
    histByKey.set(bucket, entry);
  }

  return rows.map((row) => {
    const shipping = getShippingOption(toText(row.shipping, "Non renseignee")).label;
    const loaBucket = getLoaBucket(row.loa);
    const hist = histByKey.get(`${shipping}|${loaBucket}`);
    const histProd = hist?.count ? hist.prodSum / hist.count : 0;
    const histPostOps = hist?.postOpsCount ? hist.postOpsSum / hist.postOpsCount : ETC_MODEL.defaultPostOpsHours;
    const observedProd = toNumber(row.net_prod);
    // ETC convention: blend observed vs historique with a stable 70/30 weighting.
    const modeledProd = observedProd > 0 && histProd > 0
      ? (observedProd * ETC_MODEL.observedProductivityWeight) + (histProd * ETC_MODEL.historicalProductivityWeight)
      : observedProd || histProd || 25;
    const remUnits = toNumber(row.rem_units);
    const atbDate = parsePortEventDate(row.atb, reportDate);
    const ataDate = parsePortEventDate(row.ata_pstn, reportDate);
    const etcBulletin = parseEtcEstimate(row.etc, reportDate);
    const remainingHours = modeledProd > 0 ? remUnits / modeledProd : 0;
    const projectedCompletion = remainingHours > 0 ? new Date(referenceDate.getTime() + (remainingHours * 3_600_000)) : null;
    const projectedDeparture = projectedCompletion ? new Date(projectedCompletion.getTime() + (histPostOps * 3_600_000)) : null;
    return {
      ...row,
      shippingLabel: shipping,
      loaBucket,
      ataDate,
      atbDate,
      etcBulletin,
      referenceDate,
      elapsedQuayHours: getHoursBetween(atbDate, referenceDate),
      observedProd,
      modeledProd,
      remainingHours,
      projectedCompletion,
      projectedDeparture,
      etcDriftHours: etcBulletin && projectedCompletion ? getHoursBetween(etcBulletin, projectedCompletion) : 0,
    };
  });
}

/* ───────── Data builders ───────── */

export function buildServiceRecap(rows: GenericRow[]) {
  const map = new Map<string, { service: string; voyages: number; units: number; productivitySum: number; vesselCount: number }>();
  for (const row of rows) {
    const key = toText(row.service, "Autres");
    const entry = map.get(key) ?? { service: key, voyages: 0, units: 0, productivitySum: 0, vesselCount: 0 };
    entry.voyages += 1;
    entry.units += toNumber(row.t_units);
    entry.productivitySum += toNumber(row.net_prod);
    entry.vesselCount += 1;
    map.set(key, entry);
  }
  return Array.from(map.values())
    .map((e) => ({ ...e, productivity: e.vesselCount ? e.productivitySum / e.vesselCount : 0 }))
    .sort((a, b) => b.units - a.units)
    .slice(0, 8);
}

export function buildWeekdayAverages(rows: GenericRow[]) {
  const map = new Map<string, { name: string; movements: number; ttt: number; count: number }>();
  for (const row of rows) {
    const key = toText(row.jour_nom_fr, "Autres");
    const entry = map.get(key) ?? { name: key, movements: 0, ttt: 0, count: 0 };
    entry.movements += toNumber(row.gate_total_mouvements);
    entry.ttt += toNumber(row.ttt_duree_minutes);
    entry.count += 1;
    map.set(key, entry);
  }
  return Array.from(map.values())
    .map((e) => ({ name: e.name, camions: e.count ? Math.round(e.movements / e.count) : 0, ttt: e.count ? Number((e.ttt / e.count).toFixed(1)) : 0 }))
    .sort((a, b) => WEEKDAY_ORDER.indexOf(a.name) - WEEKDAY_ORDER.indexOf(b.name));
}

export function buildPortFocus(rows: GenericRow[], field: "last_port" | "next_port") {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = toText(row[field], "Inconnu");
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([port, count]) => ({ port, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

export function buildExploitantsBreakdown(row: GenericRow) {
  return [
    { name: "CMA CGM", value: toNumber(row.exp_cma_total), color: "#10304f" },
    { name: "MSC", value: toNumber(row.exp_msk_total), color: "#164b7e" },
    { name: "Hapag-Lloyd", value: toNumber(row.exp_hlc_total), color: "#5fb0e8" },
    { name: "MGS", value: toNumber(row.exp_mgs_total), color: "#93cbf2" },
  ].filter((item) => item.value > 0);
}

export function buildParkFamilyMix(row: GenericRow) {
  const standard = toNumber(row.total_20std) + toNumber(row.total_40std) + toNumber(row.total_40htc);
  const special = toNumber(row.total_20spe) + toNumber(row.total_40spe);
  const reefer = toNumber(row.total_20rf) + toNumber(row.total_40rf);
  return [
    { name: "Standard & HC", value: standard, color: "#164b7e" },
    { name: "Speciaux", value: special, color: "#5fb0e8" },
    { name: "Reefers", value: reefer, color: "#93cbf2" },
  ].filter((item) => item.value > 0);
}

export function buildFlowMix(row: GenericRow) {
  return [
    { name: "Import", value: toNumber(row.import_teu) },
    { name: "Export", value: toNumber(row.export_teu) },
    { name: "Transbo", value: toNumber(row.transbo_teu) },
    { name: "Vides", value: toNumber(row.vides_teu) },
  ];
}

export function buildArmateurProgress(row: GenericRow) {
  return [
    { name: "CMA CGM", planned: toNumber(row.escales_cma_cgm_prevues), done: toNumber(row.escales_cma_cgm_realisees), color: "#10304f" },
    { name: "MSC", planned: toNumber(row.escales_msc_prevues), done: toNumber(row.escales_msc_realisees), color: "#164b7e" },
    { name: "Hapag-Lloyd", planned: toNumber(row.escales_hapag_lloyd_prevues), done: toNumber(row.escales_hapag_lloyd_realisees), color: "#5fb0e8" },
    { name: "Maersk", planned: toNumber(row.escales_maersk_prevues), done: toNumber(row.escales_maersk_realisees), color: "#1d6fb8" },
    { name: "Autres", planned: toNumber(row.escales_autres_prevues), done: toNumber(row.escales_autres_realisees), color: "#64748b" },
  ].filter((item) => item.planned > 0 || item.done > 0);
}

export function buildArmateurEscalesPie(row: GenericRow) {
  return [
    { name: "CMA CGM", value: toNumber(row.escales_cma_cgm_realisees), color: "#10304f" },
    { name: "MSC", value: toNumber(row.escales_msc_realisees), color: "#164b7e" },
    { name: "Hapag-Lloyd", value: toNumber(row.escales_hapag_lloyd_realisees), color: "#5fb0e8" },
    { name: "Maersk", value: toNumber(row.escales_maersk_realisees), color: "#1d6fb8" },
  ].filter((item) => item.value > 0);
}

export function buildShippingPerformance(rows: GenericRow[]) {
  const map = new Map<string, { shipping: string; voyages: number; units: number; productivitySum: number; productivityCount: number }>();
  for (const row of rows) {
    const shippingOption = getShippingOption(toText(row.shipping, "Non renseignee"));
    const key = shippingOption.value;
    const entry = map.get(key) ?? { shipping: shippingOption.label, voyages: 0, units: 0, productivitySum: 0, productivityCount: 0 };
    entry.voyages += 1;
    entry.units += toNumber(row.t_units);
    if (toNumber(row.net_prod) > 0) {
      entry.productivitySum += toNumber(row.net_prod);
      entry.productivityCount += 1;
    }
    map.set(key, entry);
  }
  return Array.from(map.values())
    .map((entry) => ({
      shipping: entry.shipping,
      voyages: entry.voyages,
      units: entry.units,
      productivity: entry.productivityCount ? entry.productivitySum / entry.productivityCount : 0,
    }))
    .sort((a, b) => b.units - a.units);
}

export function getShippingBucket(value: unknown): "CMA" | "MSC" | "HLC" | "MSK" | "MGS" | "OTHER" {
  const text = toText(value, "").toUpperCase();
  if (text.includes("CMA")) return "CMA";
  if (text.includes("MSC")) return "MSC";
  if (text.includes("HLC") || text.includes("HAPAG")) return "HLC";
  if (text.includes("MAERSK") || text.includes("MSK")) return "MSK";
  if (text.includes("MGS") || text.includes("MARGUISA")) return "MGS";
  return "OTHER";
}

export function buildYardLineRows(
  row: GenericRow,
  perfRows: GenericRow[],
  attendusRows: GenericRow[],
  operationRows: GenericRow[],
  appareillesRows: GenericRow[],
  escalesRows: GenericRow[],
) {
  const rows = [
    {
      key: "CMA",
      shipping: "CMA CGM",
      parcTotal: toNumber(row.exp_cma_total),
      reefers: toNumber(row.exp_cma_20rf) + toNumber(row.exp_cma_40rf),
      standard: toNumber(row.exp_cma_20std) + toNumber(row.exp_cma_40std) + toNumber(row.exp_cma_40htc),
      special: toNumber(row.exp_cma_20spe) + toNumber(row.exp_cma_40spe),
    },
    {
      key: "MSC",
      shipping: "MSC",
      parcTotal: 0,
      reefers: 0,
      standard: 0,
      special: 0,
    },
    {
      key: "HLC",
      shipping: "Hapag-Lloyd",
      parcTotal: toNumber(row.exp_hlc_total),
      reefers: toNumber(row.exp_hlc_20rf) + toNumber(row.exp_hlc_40rf),
      standard: toNumber(row.exp_hlc_20std) + toNumber(row.exp_hlc_40std) + toNumber(row.exp_hlc_40htc),
      special: toNumber(row.exp_hlc_20spe) + toNumber(row.exp_hlc_40spe),
    },
    {
      key: "MSK",
      shipping: "MSK / Maersk",
      parcTotal: toNumber(row.exp_msk_total),
      reefers: toNumber(row.exp_msk_20rf) + toNumber(row.exp_msk_40rf),
      standard: toNumber(row.exp_msk_20std) + toNumber(row.exp_msk_40std) + toNumber(row.exp_msk_40htc),
      special: toNumber(row.exp_msk_20spe) + toNumber(row.exp_msk_40spe),
    },
    {
      key: "MGS",
      shipping: "MGS",
      parcTotal: toNumber(row.exp_mgs_total),
      reefers: toNumber(row.exp_mgs_20rf) + toNumber(row.exp_mgs_40rf),
      standard: toNumber(row.exp_mgs_20std) + toNumber(row.exp_mgs_40std) + toNumber(row.exp_mgs_40htc),
      special: toNumber(row.exp_mgs_20spe) + toNumber(row.exp_mgs_40spe),
    },
  ];

  const stats = new Map<string, {
    unitsDone: number;
    productivitySum: number;
    productivityCount: number;
    naviresAttendus: number;
    naviresOperation: number;
    naviresAppareilles: number;
    importTeu: number;
    exportTeu: number;
    transboTeu: number;
  }>();
  for (const item of rows) {
    stats.set(item.key, {
      unitsDone: 0,
      productivitySum: 0,
      productivityCount: 0,
      naviresAttendus: 0,
      naviresOperation: 0,
      naviresAppareilles: 0,
      importTeu: 0,
      exportTeu: 0,
      transboTeu: 0,
    });
  }

  for (const perfRow of perfRows) {
    const key = getShippingBucket(perfRow.shipping);
    const entry = stats.get(key);
    if (!entry) continue;
    entry.unitsDone += toNumber(perfRow.t_units);
    const productivity = toNumber(perfRow.net_prod);
    if (productivity > 0) {
      entry.productivitySum += productivity;
      entry.productivityCount += 1;
    }
  }

  for (const vessel of attendusRows) {
    const entry = stats.get(getShippingBucket(vessel.shipping));
    if (entry) entry.naviresAttendus += 1;
  }
  for (const vessel of operationRows) {
    const entry = stats.get(getShippingBucket(vessel.shipping));
    if (entry) entry.naviresOperation += 1;
  }
  for (const vessel of appareillesRows) {
    const entry = stats.get(getShippingBucket(vessel.shipping));
    if (entry) entry.naviresAppareilles += 1;
  }

  const vesselShipping = new Map<string, string>();
  for (const vessel of [...attendusRows, ...operationRows, ...appareillesRows]) {
    const name = toText(vessel.nom_navire || vessel.nom, "").toUpperCase();
    if (name) vesselShipping.set(name, getShippingBucket(vessel.shipping));
  }

  for (const escale of escalesRows) {
    const name = toText(escale.nom_navire, "").toUpperCase();
    const key = vesselShipping.get(name);
    const entry = key ? stats.get(key) : null;
    if (!entry) continue;
    entry.importTeu += toNumber(escale.import_total_teu);
    entry.exportTeu += toNumber(escale.export_total_teu);
    entry.transboTeu += toNumber(escale.transbo_total_teu);
  }

  return rows
    .map((item) => {
      const stat = stats.get(item.key)!;
      return {
        shipping: item.shipping,
        parcTotal: item.parcTotal,
        reefers: item.reefers,
        standard: item.standard,
        special: item.special,
        unitsDone: stat.unitsDone,
        productivity: stat.productivityCount ? stat.productivitySum / stat.productivityCount : 0,
        naviresAttendus: stat.naviresAttendus,
        naviresOperation: stat.naviresOperation,
        naviresAppareilles: stat.naviresAppareilles,
        importTeu: stat.importTeu,
        exportTeu: stat.exportTeu,
        transboTeu: stat.transboTeu,
      };
    })
    .filter((item) => item.parcTotal > 0 || item.unitsDone > 0 || item.naviresAttendus > 0 || item.naviresOperation > 0 || item.naviresAppareilles > 0)
    .sort((a, b) => b.parcTotal - a.parcTotal);
}
