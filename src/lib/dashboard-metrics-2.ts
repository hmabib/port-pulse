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
export * from "./dashboard-metrics-1";
import { GenericRow, FilterOptions, InitialData, BulletinMonthRow, Cumul2026MonthRow, ShippingMonthRow, WeekdayHeatmapRow, CompletedCall, CapacityAlert, CorrelationStudyRow, GuideSection, FLOW_COLORS, WEEKDAY_ORDER, DAILY_REFRESH_HOUR, toNumber, toText, sanitizeDateText, formatChartExportLabel, buildVisibleChartLabel, renderExportPieValueLabel, filterRowsSinceYearStart, buildParcTrendRows, formatInteger, formatPercent, formatSignedInteger, formatMinutes, formatDateLabel, formatDateTimeLabel, formatShortDate, normalizeDateValue } from "./dashboard-metrics-1";

export function resolveRowDate(row: GenericRow): string {
  const directCandidates = [row.date_rapport, row.date_iso, row.ops_date_dernier_camion_iso];
  for (const candidate of directCandidates) {
    const text = sanitizeDateText(candidate);
    if (text) return text;
  }
  const year = toNumber(row.annee);
  const month = toNumber(row.mois_num);
  const day = toNumber(row.jour_du_mois);
  if (year > 0 && month > 0 && day > 0) {
    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  return "";
}

export function getWeekdayName(dateText: string): string {
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(dateText) ? `${dateText}T00:00:00Z` : dateText;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "Autres";
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", timeZone: "UTC" }).format(date)
    .replace(/^\p{L}/u, (value) => value.toUpperCase());
}

export function formatRowDate(row: GenericRow): string {
  return formatDateLabel(resolveRowDate(row));
}

export function getLatestDateFromRows(rows: GenericRow[]): string {
  let latest = "";
  for (const row of rows) {
    const value = normalizeDateValue(resolveRowDate(row));
    if (value && (!latest || value > latest)) latest = value;
  }
  return latest;
}

export function filterRowsByDate(rows: GenericRow[], date: string): GenericRow[] {
  if (!date) return [];
  return rows.filter((row) => normalizeDateValue(resolveRowDate(row)) === date);
}

export function getLatestRows(rows: GenericRow[]): GenericRow[] {
  const latestDate = getLatestDateFromRows(rows);
  return filterRowsByDate(rows, latestDate);
}

export function getLatestReportRow(rows: GenericRow[], date: string): GenericRow {
  const candidates = date ? filterRowsByDate(rows, date) : rows;
  if (candidates.length === 0) return {};

  return [...candidates].sort((a, b) => {
    const aCreated = Date.parse(sanitizeDateText(a.created_at)) || 0;
    const bCreated = Date.parse(sanitizeDateText(b.created_at)) || 0;
    const aTimestamp = toNumber(a.created_timestamp);
    const bTimestamp = toNumber(b.created_timestamp);
    return (bCreated || bTimestamp) - (aCreated || aTimestamp);
  })[0] ?? {};
}

export function formatMonthAxisLabel(value: unknown): string {
  const text = toText(value, "");
  if (!text) return "—";
  if (/^\d{4}-\d{2}$/.test(text)) {
    const [year, month] = text.split("-");
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
    return new Intl.DateTimeFormat("fr-FR", { month: "short", year: "2-digit", timeZone: "UTC" }).format(date);
  }
  return text;
}

export function buildDateJoinKey(row: GenericRow): string {
  return normalizeDateValue(resolveRowDate(row));
}

export function getDateBounds(year: string, month: string, day: string) {
  if (!year) return null;
  const monthIndex = month ? Number(month) - 1 : 0;
  const start = new Date(Date.UTC(Number(year), monthIndex, day ? Number(day) : 1));
  const end = day
    ? new Date(Date.UTC(Number(year), monthIndex, Number(day)))
    : month
      ? new Date(Date.UTC(Number(year), Number(month), 0))
      : new Date(Date.UTC(Number(year), 11, 31));
  return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
}

export function derivePleinsTeu(row: GenericRow): number {
  const direct = toNumber(row.pleins_total_teu);
  if (direct > 0) return direct;
  const byFlux = toNumber(row.import_teu) + toNumber(row.export_teu) + toNumber(row.transbo_teu);
  if (byFlux > 0) return byFlux;
  const total = toNumber(row.total_teu);
  const vides = toNumber(row.vides_teu);
  return Math.max(0, total - vides);
}

/**
 * Gabarit navire. Le champ source est du texte (« 400M ») et peut être vide
 * ou hors bornes : le garde-fou écarte les valeurs invraisemblables plutôt
 * que de produire une classe LOA fantaisiste.
 */
export function parseLoaMeters(value: unknown): number {
  return strictValueOf(guardLoaMeters(value)) ?? 0;
}

export function getLoaBucket(value: unknown): string {
  return qualityLoaBucket(value);
}

/**
 * Horodatage d'événement déjà survenu (ATA, ATB, ATC, ATD).
 *
 * Le format nominal des bulletins ne porte pas l'année, et l'OCR corrompt
 * régulièrement celle-ci quand elle est présente (« 206 » pour 2026,
 * « 2022 » pour 2025, heure collée à la date, « / » au lieu de « : »).
 * L'année est donc reconstruite par cohérence avec la date du bulletin,
 * puis vérifiée contre une fenêtre de vraisemblance — ce qui élimine les
 * escales projetées à dix mois d'écart au passage de fin d'année.
 */
export function parsePortEventDate(textValue: unknown, reportDateValue: unknown): Date | null {
  return parseBulletinTimestampOrNull(textValue, reportDateValue, "past");
}

/** Estimation de fin d'opérations : la fenêtre de vraisemblance est tournée vers l'avenir. */
export function parseEtcEstimate(textValue: unknown, reportDateValue: unknown): Date | null {
  return parseBulletinTimestampOrNull(textValue, reportDateValue, "estimate");
}

export function getHoursBetween(start: Date | null, end: Date | null): number {
  if (!start || !end) return 0;
  const diff = (end.getTime() - start.getTime()) / 3_600_000;
  return Number.isFinite(diff) && diff > 0 ? diff : 0;
}

export function formatHours(value: unknown): string {
  const hours = toNumber(value);
  if (hours <= 0) return "—";
  return `${hours.toFixed(1)} h`;
}

export function formatDateTimeCompact(value: Date | string | number | null): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : typeof value === "number" ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

export function buildCompletedCallKey(row: GenericRow): string {
  const vessel = toText(row.nom_navire, "").toUpperCase();
  const voyage = toText(row.voyage, "").toUpperCase();
  if (vessel && voyage) {
    return `${vessel}|${voyage}`;
  }
  return [
    vessel,
    voyage,
    toText(row.atb, ""),
    toText(row.atd, ""),
    toText(row.service, "").toUpperCase(),
  ].join("|");
}

export function buildCompletedCalls(rows: GenericRow[], operationRows: GenericRow[], targetYear: number): CompletedCall[] {
  const ataIndex = new Map<string, GenericRow[]>();
  for (const row of operationRows) {
    const dateRapport = normalizeDateValue(resolveRowDate(row));
    if (!dateRapport.startsWith(`${targetYear}-`)) continue;
    const voyage = toText(row.voyage, "");
    if (!voyage) continue;
    const arr = ataIndex.get(voyage) ?? [];
    arr.push(row);
    ataIndex.set(voyage, arr);
  }
  for (const rowsByVoyage of ataIndex.values()) {
    rowsByVoyage.sort((a, b) => normalizeDateValue(resolveRowDate(a)).localeCompare(normalizeDateValue(resolveRowDate(b))));
  }

  const dedup = new Map<string, GenericRow>();
  for (const row of rows) {
    const dateRapport = normalizeDateValue(resolveRowDate(row));
    if (!dateRapport.startsWith(`${targetYear}-`)) continue;
    const key = buildCompletedCallKey(row);
    const prev = dedup.get(key);
    const prevSortValue = prev
      ? sanitizeDateText(prev.atd) || sanitizeDateText(prev.atc) || sanitizeDateText(prev.atb) || normalizeDateValue(resolveRowDate(prev))
      : "";
    const nextSortValue =
      sanitizeDateText(row.atd) || sanitizeDateText(row.atc) || sanitizeDateText(row.atb) || dateRapport;
    if (!prev || prevSortValue < nextSortValue) {
      dedup.set(key, row);
    }
  }

  return Array.from(dedup.values())
    .map((row) => {
      const dateRapport = normalizeDateValue(resolveRowDate(row));
      const voyage = toText(row.voyage, "");
      const ataCandidates = ataIndex.get(voyage) ?? [];
      const sameVesselAtaCandidates = ataCandidates.filter((candidate) =>
        toText(candidate.nom_navire, "").toUpperCase() === toText(row.nom_navire, "").toUpperCase(),
      );
      const ataSource = [...(sameVesselAtaCandidates.length > 0 ? sameVesselAtaCandidates : ataCandidates)]
        .filter((candidate) => normalizeDateValue(resolveRowDate(candidate)) <= dateRapport)
        .reverse()
        .find((candidate) => parsePortEventDate(candidate.ata_pstn, resolveRowDate(candidate)));
      const ataDate = parsePortEventDate(ataSource?.ata_pstn, ataSource ? resolveRowDate(ataSource) : dateRapport);
      const atb = parsePortEventDate(row.atb, dateRapport);
      const atc = parsePortEventDate(row.atc, dateRapport);
      const atd = parsePortEventDate(row.atd, dateRapport);
      const waitHours = getHoursBetween(ataDate, atb);
      const operationHours = getHoursBetween(atb, atc ?? atd);
      const quayHours = getHoursBetween(atb, atd);
      const postOpsHours = getHoursBetween(atc, atd);
      const totalCycleHours = getHoursBetween(ataDate, atd) || quayHours || operationHours;
      const eventDate = atd ?? atc ?? atb;
      const monthKey = eventDate
        ? eventDate.toISOString().slice(0, 7)
        : dateRapport.slice(0, 7);
      return {
        key: buildCompletedCallKey(row),
        dateRapport,
        monthKey,
        shipping: getShippingOption(toText(row.shipping, "Non renseignee")).label,
        service: toText(row.service, "—"),
        vesselName: toText(row.nom_navire, "—"),
        voyage: toText(row.voyage, "—"),
        loaText: toText(row.loa, "—"),
        loaMeters: parseLoaMeters(row.loa),
        loaBucket: getLoaBucket(row.loa),
        units: toNumber(row.t_units),
        productivity: toNumber(row.net_prod),
        ataText: ataSource ? toText(ataSource.ata_pstn, "—") : "—",
        atbText: toText(row.atb, "—"),
        atcText: toText(row.atc, "—"),
        atdText: toText(row.atd, "—"),
        waitHours,
        operationHours,
        quayHours,
        postOpsHours,
        totalCycleHours,
      };
    })
    .filter((call) => call.quayHours > 0 || call.operationHours > 0 || call.totalCycleHours > 0 || call.units > 0)
    .sort((a, b) => a.dateRapport.localeCompare(b.dateRapport) || a.vesselName.localeCompare(b.vesselName));
}

export function buildCompletedCallShippingMonthlyRows(calls: CompletedCall[]): ShippingMonthRow[] {
  const map = new Map<string, { anneeMois: string; moisLabel: string; shipping: string; escales: number; units: number; prodSum: number }>();
  for (const call of calls) {
    const key = `${call.monthKey}|${call.shipping}`;
    const monthDate = new Date(`${call.monthKey}-01T00:00:00Z`);
    const moisLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: "UTC" }).format(monthDate);
    const entry = map.get(key) ?? { anneeMois: call.monthKey, moisLabel, shipping: call.shipping, escales: 0, units: 0, prodSum: 0 };
    entry.escales += 1;
    entry.units += call.units;
    entry.prodSum += call.productivity;
    map.set(key, entry);
  }
  return Array.from(map.values())
    .map((entry) => ({
      anneeMois: entry.anneeMois,
      moisLabel: entry.moisLabel,
      shipping: entry.shipping,
      escales: entry.escales,
      units: entry.units,
      productivity: entry.escales ? entry.prodSum / entry.escales : 0,
    }))
    .sort((a, b) => a.anneeMois.localeCompare(b.anneeMois) || b.escales - a.escales);
}

export function buildCompletedCallShippingStats(calls: CompletedCall[]) {
  const totalEscales = calls.length || 1;
  const map = new Map<string, { shipping: string; escales: number; units: number; prodSum: number; quaySum: number; opSum: number; waitSum: number; totalCycleSum: number; loaSum: number }>();
  for (const call of calls) {
    const entry = map.get(call.shipping) ?? { shipping: call.shipping, escales: 0, units: 0, prodSum: 0, quaySum: 0, opSum: 0, waitSum: 0, totalCycleSum: 0, loaSum: 0 };
    entry.escales += 1;
    entry.units += call.units;
    entry.prodSum += call.productivity;
    entry.quaySum += call.quayHours;
    entry.opSum += call.operationHours;
    entry.waitSum += call.waitHours;
    entry.totalCycleSum += call.totalCycleHours;
    entry.loaSum += call.loaMeters;
    map.set(call.shipping, entry);
  }
  return Array.from(map.values())
    .map((entry) => ({
      shipping: entry.shipping,
      escales: entry.escales,
      marketShare: (entry.escales / totalEscales) * 100,
      units: entry.units,
      productivity: entry.escales ? entry.prodSum / entry.escales : 0,
      waitHours: entry.escales ? entry.waitSum / entry.escales : 0,
      quayHours: entry.escales ? entry.quaySum / entry.escales : 0,
      operationHours: entry.escales ? entry.opSum / entry.escales : 0,
      totalCycleHours: entry.escales ? entry.totalCycleSum / entry.escales : 0,
      avgLoa: entry.escales ? entry.loaSum / entry.escales : 0,
    }))
    .sort((a, b) => b.escales - a.escales);
}

export function buildCompletedCallLoaStats(calls: CompletedCall[]) {
  const map = new Map<string, { loaBucket: string; escales: number; units: number; prodSum: number; quaySum: number; opSum: number; waitSum: number; totalCycleSum: number }>();
  for (const call of calls) {
    const entry = map.get(call.loaBucket) ?? { loaBucket: call.loaBucket, escales: 0, units: 0, prodSum: 0, quaySum: 0, opSum: 0, waitSum: 0, totalCycleSum: 0 };
    entry.escales += 1;
    entry.units += call.units;
    entry.prodSum += call.productivity;
    entry.quaySum += call.quayHours;
    entry.opSum += call.operationHours;
    entry.waitSum += call.waitHours;
    entry.totalCycleSum += call.totalCycleHours;
    map.set(call.loaBucket, entry);
  }
  const order = ["< 200m", "200-249m", "250-299m", "300-349m", ">= 350m", "LOA inconnue"];
  return Array.from(map.values())
    .map((entry) => ({
      loaBucket: entry.loaBucket,
      escales: entry.escales,
      units: entry.units,
      productivity: entry.escales ? entry.prodSum / entry.escales : 0,
      waitHours: entry.escales ? entry.waitSum / entry.escales : 0,
      quayHours: entry.escales ? entry.quaySum / entry.escales : 0,
      operationHours: entry.escales ? entry.opSum / entry.escales : 0,
      totalCycleHours: entry.escales ? entry.totalCycleSum / entry.escales : 0,
    }))
    .sort((a, b) => order.indexOf(a.loaBucket) - order.indexOf(b.loaBucket));
}

export function buildMonthlyTrafficRows(rows: Cumul2026MonthRow[]) {
  return rows.map((row) => ({
    ...row,
    pleinsDerives: row.importTeu + row.exportTeu + row.transboTeu,
    marketReadyDate: formatMonthAxisLabel(row.anneeMois),
  }));
}
