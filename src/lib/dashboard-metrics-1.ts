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
import { resolveRowDate } from "./dashboard-metrics-2";

/* ───────── Types ───────── */

export type GenericRow = Record<string, unknown>;

export interface FilterOptions {
  years: number[];
  months: { num: number; name: string }[];
  shippingLines: ShippingOption[];
}

export interface InitialData {
  dailyData: GenericRow[];
  monthlyData: GenericRow[];
  naviresPerformance: GenericRow[];
  gateData: GenericRow[];
  armateursData: GenericRow[];
  exploitantsData: GenericRow[];
  naviresAttendus: GenericRow[];
  naviresAppareilles: GenericRow[];
  naviresOperation: GenericRow[];
  operationsEscales: GenericRow[];
  parcConteneurs: GenericRow[];
  rapportQuotidien: GenericRow[];
  kpisData: GenericRow[];
}

export interface BulletinMonthRow {
  anneeMois: string;
  annee: number;
  moisLabel: string;
  realized: number;
  budget: number;
  importTeu: number;
  exportTeu: number;
  transboTeu: number;
  videsTeu: number;
  gateCamionsSum: number;
  gateMovementsSum: number;
  entreesPleinsSum: number;
  entreesVidesSum: number;
  sortiesPleinsSum: number;
  sortiesVidesSum: number;
  tttAverage: number;
  occupationAverage: number;
  reefersAverage: number;
  escalesRateAverage: number;
  utilisationAverage: number;
  productivityAverage: number;
  latestDate: string;
}

export interface Cumul2026MonthRow {
  anneeMois: string;
  moisLabel: string;
  latestDate: string;
  nbJours: number;
  gateDayCount: number;
  gateAverageDayCount: number;
  occupancyDayCount: number;
  productivityCount: number;
  tttObservedDays: number;
  // Cumuls from last day of month
  totalTeu: number;
  importTeu: number;
  exportTeu: number;
  transboTeu: number;
  pleinsTeu: number;
  videsTeu: number;
  totalForecast: number;
  tauxRealisation: number;
  escalesRealisees: number;
  // Daily averages across month
  occupationAvg: number;
  reefersAvg: number;
  tttAvg: number;
  camionsAvgJour: number;
  mouvementsAvgJour: number;
  entreesTotalAvgJour: number;
  sortiesPleinAvgJour: number;
  sortiesVideAvgJour: number;
  sortiesTotalAvgJour: number;
  entreesPleinAvgJour: number;
  entreesVideAvgJour: number;
  productivityAverage: number;
  // Cumuls gate month
  gateEntreesPleins: number;
  gateEntreesVides: number;
  gateSortiesPleins: number;
  gateSortiesVides: number;
  totalCamions: number;
}

export interface ShippingMonthRow {
  anneeMois: string;
  moisLabel: string;
  shipping: string;
  escales: number;
  units: number;
  productivity: number;
}

export interface WeekdayHeatmapRow {
  dayName: string;
  tttAverage: number;
  camionsAverage: number;
}

export interface CompletedCall {
  key: string;
  dateRapport: string;
  monthKey: string;
  shipping: string;
  service: string;
  vesselName: string;
  voyage: string;
  loaText: string;
  loaMeters: number;
  loaBucket: string;
  units: number;
  productivity: number;
  ataText: string;
  atbText: string;
  atcText: string;
  atdText: string;
  waitHours: number;
  operationHours: number;
  quayHours: number;
  postOpsHours: number;
  totalCycleHours: number;
}

export interface CapacityAlert {
  id: string;
  level: "critical" | "warning" | "info";
  title: string;
  description: string;
}

export interface CorrelationStudyRow {
  anneeMois: string;
  moisLabel: string;
  x: number;
  y: number;
  waitingCount?: number;
  congestionRate?: number;
  occupancyAvg?: number;
  avgCongestionHours?: number;
  quayHours?: number;
  productivity?: number;
}

export interface GuideSection {
  title: string;
  description: string;
  bullets: string[];
}

/* ───────── Constants ───────── */

export const FLOW_COLORS = ["#164b7e", "#2e90d9", "#5fb0e8", "#93cbf2"];

export const WEEKDAY_ORDER = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export const DAILY_REFRESH_HOUR = 13;

/* ───────── Utility functions ───────── */

export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function toText(value: unknown, fallback = "—"): string {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  return fallback;
}

export function sanitizeDateText(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  const text = toText(value, "");
  if (!text) return "";
  return text.startsWith("$D") ? text.slice(2) : text;
}

export function formatChartExportLabel(value: unknown): string {
  const number = toNumber(value);
  if (!Number.isFinite(number) || number === 0) return "";
  if (Math.abs(number) >= 1000) return formatInteger(number);
  if (Number.isInteger(number)) return String(number);
  return number.toFixed(1);
}

export function buildVisibleChartLabel(
  options?: {
    color?: string;
    position?: "top" | "right" | "insideTop";
    formatter?: (value: unknown) => string;
  },
) {
  return {
    fill: options?.color ?? "#7396b5",
    fontSize: 10,
    position: options?.position,
    formatter: options?.formatter ?? formatChartExportLabel,
  };
}

export function renderExportPieValueLabel({
  name,
  value,
  percent,
}: {
  name?: string;
  value?: number;
  percent?: number;
}) {
  const label = typeof name === "string" ? name : "";
  const numericValue = typeof value === "number" ? value : 0;
  const pct = typeof percent === "number" ? ` (${(percent * 100).toFixed(0)}%)` : "";
  if (!label && !numericValue) return "";
  return `${label} ${formatChartExportLabel(numericValue)}${pct}`.trim();
}

export function filterRowsSinceYearStart(rows: GenericRow[], year: number): GenericRow[] {
  const start = `${year}-01-01`;
  const end = `${year + 1}-01-01`;
  return rows.filter((row) => {
    const date = normalizeDateValue(resolveRowDate(row));
    return Boolean(date && date >= start && date < end);
  });
}

export function buildParcTrendRows(rows: GenericRow[], year: number): GenericRow[] {
  const filtered = filterRowsSinceYearStart(rows, year);
  return filtered.map((row, index) => {
    const previous = filtered[index - 1];
    const currentUsed = toNumber(row.parc_conteneurs_utilise);
    const previousUsed = previous ? toNumber(previous.parc_conteneurs_utilise) : currentUsed;
    return {
      ...row,
      variation_utilise: currentUsed - previousUsed,
    };
  });
}

export function formatInteger(value: unknown): string {
  return new Intl.NumberFormat("fr-FR").format(toNumber(value));
}

export function formatPercent(value: unknown): string {
  return `${toNumber(value).toFixed(1)}%`;
}

export function formatSignedInteger(value: number): string {
  const formatted = formatInteger(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

export function formatMinutes(value: unknown): string {
  const minutes = Math.max(0, Math.round(toNumber(value)));
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function formatDateLabel(value: unknown): string {
  const text = sanitizeDateText(value);
  if (!text) return "—";
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00Z` : text;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return text;
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

export function formatDateTimeLabel(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    const date = new Date(value * 1000);
    return Number.isNaN(date.getTime())
      ? "—"
      : new Intl.DateTimeFormat("fr-FR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "UTC",
        }).format(date);
  }

  const text = sanitizeDateText(value);
  if (!text) return "—";
  if (/^\d{10}$/.test(text)) {
    const date = new Date(Number(text) * 1000);
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
      }).format(date);
    }
  }
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00Z` : text;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return text;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

export function formatShortDate(value: unknown): string {
  const text = sanitizeDateText(value);
  if (!text) return "—";
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00Z` : text;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return text;
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", timeZone: "UTC" }).format(date);
}

export function normalizeDateValue(value: unknown): string {
  const text = sanitizeDateText(value);
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}
