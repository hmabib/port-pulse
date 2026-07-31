import DashboardClient from "@/components/DashboardClient";
import { queryAll } from "@/lib/db";
import { getUniqueShippingOptions } from "@/lib/shipping";
import {
  CUMULATIVE_VOLUME_FIELDS,
  analyzeCoverage,
  analyzeWeekdayCoverage,
  decumulateMonthlyVolumes,
  dedupeByReportDate,
  guardDailyVolume,
  guardLoaMeters,
  guardProductivity,
  guardTtt,
  listDuplicateReportDates,
  normalizeDateOnly,
  ok,
  parseBulletinTimestamp,
  parseBulletinTimestampOrNull,
  reconcileCallTimeline,
  rejected,
  summarizeQuality,
  QUALITY_RULES,
} from "@/lib/data-quality";
import type { MainTabId, MenuEntryId, SegmentId } from "@/components/ui/Navigation";
import type { DataQualityDetails } from "@/components/views/DataQualityView";

export const dynamic = "force-dynamic";

const MAIN_TABS = new Set([
  "situation",
  "cumul2026",
  "operations",
  "bulletin",
  "segments",
  "navires",
  "analyse",
  "croisee",
  "intelligence",
  "chat",
  "quality",
]);

const SEGMENTS = new Set([
  "global",
  "volumes",
  "gate",
  "escales",
  "exploitants",
  "kpis",
  "attendus",
  "appareilles",
  "operation",
  "escalesOps",
  "parc",
  "rapport",
]);

const VISIBLE_MENU_ITEMS: MenuEntryId[] = [
  "situation",
  "cumul2026",
  "operations",
  "bulletin",
  "navires",
  "analyse",
  "croisee",
  "intelligence",
  "chat",
  "quality",
  "segment:global",
  "segment:volumes",
  "segment:gate",
  "segment:escales",
  "segment:exploitants",
  "segment:kpis",
  "segment:attendus",
  "segment:appareilles",
  "segment:operation",
  "segment:escalesOps",
  "segment:parc",
  "segment:rapport",
];

type Row = Record<string, unknown>;

function asNumber(value: unknown): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

/**
 * Tables produisant au plus un état par jour. Plusieurs bulletins ont été
 * observés sur une même date (jusqu'à cinq) : sans arbitrage explicite, la
 * ligne retenue dépendrait de l'ordre de tri du moteur, qui n'est pas garanti.
 */
function prepareDailySnapshot(rows: Row[]): Row[] {
  return dedupeByReportDate(rows);
}

function buildQualityDetails(
  rawDaily: Row[],
  sources: {
    performance: Row[];
    expected: Row[];
    completed: Row[];
    active: Row[];
    gate: Row[];
  },
): DataQualityDetails {
  const deduped = dedupeByReportDate(rawDaily);
  const coverage = analyzeCoverage(deduped);
  const lastDate = coverage?.lastDate ?? "";
  const start = lastDate
    ? new Date(new Date(`${lastDate}T00:00:00Z`).getTime() - 29 * 86_400_000).toISOString().slice(0, 10)
    : "";
  const inWindow = (row: Row) => {
    const date = normalizeDateOnly(row.date_rapport);
    return Boolean(date && (!start || date >= start) && (!lastDate || date <= lastDate));
  };
  const raw30 = rawDaily.filter(inWindow);
  const deduped30 = dedupeByReportDate(raw30);
  const duplicates = listDuplicateReportDates(raw30);

  const pick = (row: Row, keys: string[]): unknown => {
    for (const key of keys) {
      const value = row[key];
      if (value !== null && value !== undefined && value !== "") return value;
    }
    return "";
  };
  const vessel = (row: Row) => String(pick(row, ["nom_navire", "vessel_name", "navire", "vessel"]) || "Navire non renseigné");
  const timestampSources = [
    ...sources.performance.filter(inWindow),
    ...sources.completed.filter(inWindow),
    ...sources.active.filter(inWindow),
  ];
  const rejectedTimestamps: DataQualityDetails["rejectedTimestamps"] = [];
  const pastResults = timestampSources.flatMap((row) =>
    ["ata", "atb", "atc", "atd"].flatMap((field) => {
      const raw = row[field];
      if (raw === null || raw === undefined || raw === "") return [];
      const result = parseBulletinTimestamp(raw, row.date_rapport, "past");
      if (result.status === "rejected") {
        rejectedTimestamps.push({
          reportDate: normalizeDateOnly(row.date_rapport),
          vessel: vessel(row),
          field: field.toUpperCase(),
          raw: String(raw),
          reason: result.reason,
        });
      }
      return [result];
    }),
  );
  const futureRows = [...sources.expected.filter(inWindow), ...sources.active.filter(inWindow)];
  const futureResults = futureRows.flatMap((row) =>
    ["eta", "etb", "etc"].flatMap((field) => {
      const raw = row[field];
      if (raw === null || raw === undefined || raw === "") return [];
      const result = parseBulletinTimestamp(raw, row.date_rapport, "estimate");
      if (result.status === "rejected") {
        rejectedTimestamps.push({
          reportDate: normalizeDateOnly(row.date_rapport),
          vessel: vessel(row),
          field: field.toUpperCase(),
          raw: String(raw),
          reason: result.reason,
        });
      }
      return [result];
    }),
  );

  const dateResults = raw30.map((row) => {
    const date = normalizeDateOnly(row.date_rapport);
    return date && date >= QUALITY_RULES.dateMin ? ok(date) : rejected("Date de bulletin hors période connue");
  });
  const duplicateResults = duplicates.flatMap((item) =>
    Array.from({ length: item.removed }, () => rejected(`Bulletin dupliqué le ${item.date}`)),
  );
  const windowCoverage = analyzeCoverage(deduped30);
  const gapResults = (windowCoverage?.gaps ?? []).map((gap) =>
    rejected(`Collecte interrompue ${gap.days} jour(s), du ${gap.from} au ${gap.to}`),
  );
  const sortedDaily = [...deduped30].sort((a, b) =>
    normalizeDateOnly(a.date_rapport).localeCompare(normalizeDateOnly(b.date_rapport)),
  );
  const negativeDeltaResults = sortedDaily.flatMap((row, index) => {
    const previous = sortedDaily[index - 1];
    if (!previous) return [];
    const date = normalizeDateOnly(row.date_rapport);
    const previousDate = normalizeDateOnly(previous.date_rapport);
    if (date.slice(0, 7) !== previousDate.slice(0, 7)) return [];
    return CUMULATIVE_VOLUME_FIELDS.flatMap((field) =>
      asNumber(row[field]) < asNumber(previous[field])
        ? [rejected(`${field} recule entre ${previousDate} et ${date}`)]
        : [],
    );
  });
  const decumulated30 = decumulateMonthlyVolumes(deduped30, [...CUMULATIVE_VOLUME_FIELDS]);
  const cycleResults = timestampSources.map((row) =>
    reconcileCallTimeline({
      ata: parseBulletinTimestampOrNull(row.ata, row.date_rapport, "past"),
      atb: parseBulletinTimestampOrNull(row.atb, row.date_rapport, "past"),
      atc: parseBulletinTimestampOrNull(row.atc, row.date_rapport, "past"),
      atd: parseBulletinTimestampOrNull(row.atd, row.date_rapport, "past"),
    }),
  );

  const guards = [
    { rule: "R1", results: dateResults },
    { rule: "R2", results: duplicateResults },
    { rule: "R3", results: [] },
    { rule: "R4", results: gapResults },
    { rule: "R5", results: negativeDeltaResults },
    { rule: "R6", results: pastResults },
    { rule: "R7", results: futureResults },
    { rule: "R8", results: sources.performance.filter(inWindow).map((row) => guardProductivity(pick(row, ["net_prod", "productivity"]))) },
    { rule: "R9", results: sources.gate.filter(inWindow).map((row) => guardTtt(pick(row, ["ttt_duree_minutes", "ttt_minutes"]))) },
    { rule: "R10", results: cycleResults },
    { rule: "R11", results: timestampSources.map((row) => guardLoaMeters(pick(row, ["loa", "loa_m", "longueur"]))) },
    { rule: "R12", results: [] },
    { rule: "R13", results: [] },
    { rule: "R14", results: decumulated30.map((row) => guardDailyVolume(row.total_teu_jour)) },
    { rule: "R15", results: deduped30.map((row) => asNumber(row.total_forecast) === 0 ? rejected("Dénominateur forecast nul") : ok(row.total_forecast)) },
  ];
  const summary = summarizeQuality(raw30, deduped30, guards);
  const rejectionByRule = new Map(summary.rejections.map((item) => [item.rule, item]));

  return {
    summary,
    lastBulletin: lastDate,
    weekdayCoverage: analyzeWeekdayCoverage(deduped),
    duplicates,
    ruleCounts: Array.from({ length: 15 }, (_, index) => {
      const rule = `R${index + 1}`;
      const rejection = rejectionByRule.get(rule);
      return { rule, count: rejection?.count ?? 0, sample: rejection?.sample ?? "Aucun rejet sur 30 jours" };
    }),
    rejectedTimestamps,
  };
}

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  try {
    const resolvedSearchParams = searchParams ? await searchParams : {};
    const rawTab = Array.isArray(resolvedSearchParams.tab) ? resolvedSearchParams.tab[0] : resolvedSearchParams.tab;
    const rawSegment = Array.isArray(resolvedSearchParams.segment) ? resolvedSearchParams.segment[0] : resolvedSearchParams.segment;
    const initialTab: MainTabId = rawTab && MAIN_TABS.has(rawTab) ? (rawTab as MainTabId) : "situation";
    const initialSegment: SegmentId = rawSegment && SEGMENTS.has(rawSegment) ? (rawSegment as SegmentId) : "global";

    // Requêtes indépendantes : exécutées en parallèle sur le pool.
    const [
      yearsRes,
      monthsRes,
      shippingRes,
      dailyRes,
      performanceRes,
      monthlyRes,
      gateRes,
      armateursRes,
      exploitantsRes,
      naviresAttendusRes,
      naviresAppareillesRes,
      naviresOperationRes,
      operationsEscalesRes,
      parcConteneursRes,
      rapportQuotidienRes,
      kpisRes,
    ] = await queryAll([
      { text: `SELECT DISTINCT annee FROM kct.dim_date WHERE annee IS NOT NULL ORDER BY annee DESC` },
      { text: `SELECT DISTINCT mois_num, mois_nom_fr FROM kct.dim_date WHERE mois_num IS NOT NULL ORDER BY mois_num ASC` },
      { text: `SELECT DISTINCT shipping FROM kct.v_navires_performance WHERE shipping IS NOT NULL ORDER BY shipping ASC` },
      { text: `SELECT * FROM kct.v_kct_daily ORDER BY date_rapport DESC LIMIT 400` },
      { text: `SELECT * FROM kct.v_navires_performance ORDER BY date_rapport DESC LIMIT 1000` },
      { text: `SELECT * FROM kct.v_kct_monthly ORDER BY annee DESC, mois_num DESC LIMIT 18` },
      { text: `SELECT * FROM kct.kct_gate_ttt ORDER BY date_rapport DESC LIMIT 400` },
      { text: `SELECT * FROM kct.kct_escales_armateurs ORDER BY date_rapport DESC LIMIT 400` },
      { text: `SELECT * FROM kct.kct_exploitants_parc ORDER BY date_rapport DESC LIMIT 400` },
      { text: `SELECT * FROM kct.kct_navires_attendus ORDER BY date_rapport DESC LIMIT 400` },
      { text: `SELECT * FROM kct.kct_navires_appareilles ORDER BY date_rapport DESC LIMIT 1000` },
      { text: `SELECT * FROM kct.kct_navires_operation ORDER BY date_rapport DESC LIMIT 400` },
      { text: `SELECT * FROM kct.kct_operations_escales ORDER BY date_rapport DESC LIMIT 400` },
      { text: `SELECT * FROM kct.kct_parc_conteneurs ORDER BY date_rapport DESC LIMIT 400` },
      { text: `SELECT * FROM kct.kct_rapport_quotidien ORDER BY date_rapport DESC LIMIT 400` },
      { text: `SELECT * FROM kct.kct_kpis ORDER BY date_rapport DESC LIMIT 400` },
    ]);

    const filterOptions = {
      years: (yearsRes.rows || []).map((row) => asNumber(row.annee)),
      months: (monthsRes.rows || []).map((row) => ({
        num: asNumber(row.mois_num),
        name: asText(row.mois_nom_fr),
      })),
      shippingLines: getUniqueShippingOptions(
        (shippingRes.rows || []).map((row) => asText(row.shipping)),
      ),
    };

    const rawDaily = dailyRes.rows || [];

    // Déduplication puis dé-cumul : `total_teu` et ses composantes sont des
    // cumuls mensuels remis à zéro au premier bulletin du mois. Les champs
    // `*_jour` portent le volume réellement réalisé entre deux bulletins.
    const dailyData = decumulateMonthlyVolumes(
      prepareDailySnapshot(rawDaily),
      [...CUMULATIVE_VOLUME_FIELDS],
    );

    const gateData = prepareDailySnapshot(gateRes.rows || []);
    const parcConteneurs = prepareDailySnapshot(parcConteneursRes.rows || []);
    const kpisData = prepareDailySnapshot(kpisRes.rows || []);
    const armateursData = prepareDailySnapshot(armateursRes.rows || []);
    const exploitantsData = prepareDailySnapshot(exploitantsRes.rows || []);
    const rapportQuotidien = prepareDailySnapshot(rapportQuotidienRes.rows || []);

    const initialData = {
      dailyData,
      naviresPerformance: performanceRes.rows || [],
      monthlyData: (monthlyRes.rows || []).reverse(),
      gateData,
      armateursData,
      exploitantsData,
      naviresAttendus: naviresAttendusRes.rows || [],
      naviresAppareilles: naviresAppareillesRes.rows || [],
      naviresOperation: naviresOperationRes.rows || [],
      operationsEscales: operationsEscalesRes.rows || [],
      parcConteneurs,
      rapportQuotidien,
      kpisData,
    };

    const coverage = analyzeCoverage(dailyData);
    const quality = {
      duplicatesRemoved: rawDaily.length - dailyData.length,
      coveragePct: coverage ? Math.round(coverage.coveragePct) : null,
      reportedDays: coverage?.reportedDays ?? 0,
      missingDays: coverage?.missingDays ?? 0,
      gaps: coverage?.gaps.slice(0, 5) ?? [],
      lastBulletin: coverage?.lastDate ?? "",
    };
    const qualityDetails = buildQualityDetails(rawDaily, {
      performance: performanceRes.rows || [],
      expected: naviresAttendusRes.rows || [],
      completed: naviresAppareillesRes.rows || [],
      active: naviresOperationRes.rows || [],
      gate: gateRes.rows || [],
    });

    return (
      <DashboardClient
        filterOptions={filterOptions}
        initialData={initialData}
        initialTab={initialTab}
        initialSegment={initialSegment}
        visibleMenuItems={VISIBLE_MENU_ITEMS}
        quality={quality}
        qualityDetails={qualityDetails}
      />
    );
  } catch (error) {
    console.error("Échec du rendu du tableau de bord:", error);

    return (
      <DashboardClient
        filterOptions={{ years: [], months: [], shippingLines: [] }}
        initialData={{
          dailyData: [],
          naviresPerformance: [],
          monthlyData: [],
          gateData: [],
          armateursData: [],
          exploitantsData: [],
          naviresAttendus: [],
          naviresAppareilles: [],
          naviresOperation: [],
          operationsEscales: [],
          parcConteneurs: [],
          rapportQuotidien: [],
          kpisData: [],
        }}
        initialTab="situation"
        initialSegment="global"
        visibleMenuItems={VISIBLE_MENU_ITEMS}
        qualityDetails={null}
        serverError="Connexion à la base de données indisponible. Le tableau de bord est chargé en mode dégradé."
      />
    );
  }
}
