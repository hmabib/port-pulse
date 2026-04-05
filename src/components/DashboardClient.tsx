"use client";

import React, { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  ArrowRightLeft,
  Brain,
  CalendarRange,
  CheckCircle2,
  Container,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Gauge,
  Info,
  LoaderCircle,
  MapPinned,
  PanelLeftClose,
  PanelLeftOpen,
  Ship,
  Truck,
  X,
  XCircle,
} from "lucide-react";
import { getShippingOption, ShippingOption } from "@/lib/shipping";
import { downloadCsv as exportCsv, downloadExcel, downloadPdf, captureCharts, type ExcelSheet, type PdfSection } from "@/lib/exports";
import {
  analyzeDailyPerformance,
  analyzeMonthly,
  analyzeAnnual,
  buildCrossAnalysis,
  generateIntelligence,
  type Insight,
  type InsightLevel,
  type CrossAnalysis as CrossAnalysisType,
  type DailyAnalysis,
  type MonthlyAnalysis,
  type AnnualAnalysis,
} from "@/lib/analytics";
import { SEGMENT_ITEMS, type MainTabId, type MenuEntryId, type SegmentId } from "./ui/Navigation";
import MetricCard from "./ui/MetricCard";
import DataTable from "./ui/DataTable";
import SectionCard from "./ui/SectionCard";
import ChartTooltip, { CHART_GRID_PROPS, CHART_AXIS_PROPS } from "./ui/ChartTooltip";
import ShippingBadge from "./ui/ShippingBadge";

import Navigation from "./ui/Navigation";
import ChatPanel from "./ChatPanel";

/* ───────── Types ───────── */

type GenericRow = Record<string, unknown>;

interface FilterOptions {
  years: number[];
  months: { num: number; name: string }[];
  shippingLines: ShippingOption[];
}

interface InitialData {
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

interface BulletinMonthRow {
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

interface Cumul2026MonthRow {
  anneeMois: string;
  moisLabel: string;
  latestDate: string;
  nbJours: number;
  gateDayCount: number;
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

interface ShippingMonthRow {
  anneeMois: string;
  moisLabel: string;
  shipping: string;
  escales: number;
  units: number;
  productivity: number;
}

interface WeekdayHeatmapRow {
  dayName: string;
  tttAverage: number;
  camionsAverage: number;
}

interface CompletedCall {
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

interface CapacityAlert {
  id: string;
  level: "critical" | "warning" | "info";
  title: string;
  description: string;
}

interface CorrelationStudyRow {
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

interface GuideSection {
  title: string;
  description: string;
  bullets: string[];
}

/* ───────── Constants ───────── */

const FLOW_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];
const WEEKDAY_ORDER = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const DAILY_REFRESH_HOUR = 13;

/* ───────── Utility functions ───────── */

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toText(value: unknown, fallback = "—"): string {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  return fallback;
}

function sanitizeDateText(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  const text = toText(value, "");
  if (!text) return "";
  return text.startsWith("$D") ? text.slice(2) : text;
}

function formatChartExportLabel(value: unknown): string {
  const number = toNumber(value);
  if (!Number.isFinite(number) || number === 0) return "";
  if (Math.abs(number) >= 1000) return formatInteger(number);
  if (Number.isInteger(number)) return String(number);
  return number.toFixed(1);
}

function renderExportPieValueLabel({
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

function filterRowsSinceYearStart(rows: GenericRow[], year: number): GenericRow[] {
  const start = `${year}-01-01`;
  const end = `${year + 1}-01-01`;
  return rows.filter((row) => {
    const date = normalizeDateValue(resolveRowDate(row));
    return Boolean(date && date >= start && date < end);
  });
}

function buildParcTrendRows(rows: GenericRow[], year: number): GenericRow[] {
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

function formatInteger(value: unknown): string {
  return new Intl.NumberFormat("fr-FR").format(toNumber(value));
}

function formatPercent(value: unknown): string {
  return `${toNumber(value).toFixed(1)}%`;
}

function formatSignedInteger(value: number): string {
  const formatted = formatInteger(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

function formatMinutes(value: unknown): string {
  const minutes = Math.max(0, Math.round(toNumber(value)));
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function formatDateLabel(value: unknown): string {
  const text = sanitizeDateText(value);
  if (!text) return "—";
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00Z` : text;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return text;
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

function formatDateTimeLabel(value: unknown): string {
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

function formatShortDate(value: unknown): string {
  const text = sanitizeDateText(value);
  if (!text) return "—";
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00Z` : text;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return text;
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", timeZone: "UTC" }).format(date);
}

function normalizeDateValue(value: unknown): string {
  const text = sanitizeDateText(value);
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function resolveRowDate(row: GenericRow): string {
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

function getWeekdayName(dateText: string): string {
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(dateText) ? `${dateText}T00:00:00Z` : dateText;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "Autres";
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", timeZone: "UTC" }).format(date)
    .replace(/^\p{L}/u, (value) => value.toUpperCase());
}

function formatRowDate(row: GenericRow): string {
  return formatDateLabel(resolveRowDate(row));
}

function getLatestDateFromRows(rows: GenericRow[]): string {
  let latest = "";
  for (const row of rows) {
    const value = normalizeDateValue(resolveRowDate(row));
    if (value && (!latest || value > latest)) latest = value;
  }
  return latest;
}

function filterRowsByDate(rows: GenericRow[], date: string): GenericRow[] {
  if (!date) return [];
  return rows.filter((row) => normalizeDateValue(resolveRowDate(row)) === date);
}

function getLatestRows(rows: GenericRow[]): GenericRow[] {
  const latestDate = getLatestDateFromRows(rows);
  return filterRowsByDate(rows, latestDate);
}

function getLatestReportRow(rows: GenericRow[], date: string): GenericRow {
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

function formatMonthAxisLabel(value: unknown): string {
  const text = toText(value, "");
  if (!text) return "—";
  if (/^\d{4}-\d{2}$/.test(text)) {
    const [year, month] = text.split("-");
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
    return new Intl.DateTimeFormat("fr-FR", { month: "short", year: "2-digit", timeZone: "UTC" }).format(date);
  }
  return text;
}

function buildRowKey(row: GenericRow): string {
  return [toText(row.rapport_id, ""), toText(row.date_id, ""), toText(row.date_rapport, "")].filter(Boolean).join("|");
}

function getDateBounds(year: string, month: string, day: string) {
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

function derivePleinsTeu(row: GenericRow): number {
  const direct = toNumber(row.pleins_total_teu);
  if (direct > 0) return direct;
  const byFlux = toNumber(row.import_teu) + toNumber(row.export_teu) + toNumber(row.transbo_teu);
  if (byFlux > 0) return byFlux;
  const total = toNumber(row.total_teu);
  const vides = toNumber(row.vides_teu);
  return Math.max(0, total - vides);
}

function parseLoaMeters(value: unknown): number {
  const text = toText(value, "");
  const match = text.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return 0;
  return Number(match[1].replace(",", ".")) || 0;
}

function getLoaBucket(value: unknown): string {
  const loa = parseLoaMeters(value);
  if (loa <= 0) return "LOA inconnue";
  if (loa < 200) return "< 200m";
  if (loa < 250) return "200-249m";
  if (loa < 300) return "250-299m";
  if (loa < 350) return "300-349m";
  return ">= 350m";
}

function parsePortEventDate(textValue: unknown, reportDateValue: unknown): Date | null {
  const text = toText(textValue, "");
  if (!text) return null;
  const reportDate = normalizeDateValue(reportDateValue);
  const reportYear = reportDate ? Number(reportDate.slice(0, 4)) : new Date().getUTCFullYear();
  const reportMonth = reportDate ? Number(reportDate.slice(5, 7)) : 1;

  let match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
  if (match) {
    const [, dd, mm, yyyy, hh, min] = match;
    return new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min)));
  }

  match = text.match(/^(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})/);
  if (match) {
    const [, dd, mm, hh, min] = match;
    let year = reportYear;
    const parsedMonth = Number(mm);
    if (reportMonth === 1 && parsedMonth === 12) year -= 1;
    if (reportMonth === 12 && parsedMonth === 1) year += 1;
    return new Date(Date.UTC(year, parsedMonth - 1, Number(dd), Number(hh), Number(min)));
  }

  const normalized = sanitizeDateText(text);
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseEtcEstimate(textValue: unknown, reportDateValue: unknown): Date | null {
  const text = toText(textValue, "");
  if (!text) return null;
  const direct = parsePortEventDate(text, reportDateValue);
  if (direct) return direct;

  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(AM|PM)/i);
  if (!match) return null;
  const [, dd, mm, yyyy, meridiem] = match;
  const hour = meridiem.toUpperCase() === "AM" ? 10 : 18;
  return new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), hour, 0));
}

function getHoursBetween(start: Date | null, end: Date | null): number {
  if (!start || !end) return 0;
  const diff = (end.getTime() - start.getTime()) / 3_600_000;
  return Number.isFinite(diff) && diff > 0 ? diff : 0;
}

function formatHours(value: unknown): string {
  const hours = toNumber(value);
  if (hours <= 0) return "—";
  return `${hours.toFixed(1)} h`;
}

function formatDateTimeCompact(value: Date | string | number | null): string {
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

function buildCompletedCallKey(row: GenericRow): string {
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

function buildCompletedCalls(rows: GenericRow[], operationRows: GenericRow[], targetYear: number): CompletedCall[] {
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

function buildCompletedCallShippingMonthlyRows(calls: CompletedCall[]): ShippingMonthRow[] {
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

function buildCompletedCallShippingStats(calls: CompletedCall[]) {
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

function buildCompletedCallLoaStats(calls: CompletedCall[]) {
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

function buildMonthlyTrafficRows(rows: Cumul2026MonthRow[]) {
  return rows.map((row) => ({
    ...row,
    pleinsDerives: row.importTeu + row.exportTeu + row.transboTeu,
    marketReadyDate: formatMonthAxisLabel(row.anneeMois),
  }));
}

function buildMonthlyCycleRows(calls: CompletedCall[]) {
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

function buildMonthlyProductivityByShipping(calls: CompletedCall[], limit = 5) {
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

function buildMonthlyProductivityByLoa(calls: CompletedCall[]) {
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

function computePearsonCorrelation(points: Array<{ x: number; y: number }>) {
  const valid = points.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  if (valid.length < 3) return 0;
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

function describeCorrelationStrength(value: number) {
  const abs = Math.abs(value);
  if (abs >= 0.7) return "forte";
  if (abs >= 0.4) return "moderee";
  return "faible";
}

function buildCongestionVsOccupationRows(calls: CompletedCall[], monthlyRows: Cumul2026MonthRow[], threshold: number): CorrelationStudyRow[] {
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

function buildMonthlyQuayVsProductivityRows(calls: CompletedCall[]): CorrelationStudyRow[] {
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

function buildWaitingCountVsCongestionRateRows(calls: CompletedCall[], threshold: number): CorrelationStudyRow[] {
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

function buildCapacityAlerts(
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

function isJustInTime(row: GenericRow) {
  const projectedCompletion = row.projectedCompletion instanceof Date ? row.projectedCompletion : null;
  const etcBulletin = row.etcBulletin instanceof Date ? row.etcBulletin : null;
  if (!projectedCompletion || !etcBulletin) return false;
  return projectedCompletion.getTime() <= etcBulletin.getTime();
}

function getProductivityAppreciation(row: GenericRow) {
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
    if (observed >= modeled * 1.05) {
      return {
        label: "Positive",
        arrow: "↑",
        className: "bg-emerald-500/15 text-emerald-400",
      };
    }
    if (observed <= modeled * 0.95) {
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

function JitStatusBadge({ active, warningLabel = "A surveiller" }: { active: boolean; warningLabel?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
        active
          ? "animate-[pulse_0.75s_ease-in-out_infinite] bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/60 shadow-[0_0_16px_rgba(52,211,153,0.45)]"
          : "animate-[pulse_1.2s_ease-in-out_infinite] bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/50 shadow-[0_0_14px_rgba(251,191,36,0.28)]"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-300" : "bg-amber-300"} shadow-[0_0_10px_currentColor]`} />
      <span>{active ? "Just in time" : warningLabel}</span>
    </span>
  );
}

function buildActiveOperationPredictions(rows: GenericRow[], reportRow: GenericRow, completedCalls: CompletedCall[]) {
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
    const histPostOps = hist?.postOpsCount ? hist.postOpsSum / hist.postOpsCount : 1.5;
    const observedProd = toNumber(row.net_prod);
    const modeledProd = observedProd > 0 && histProd > 0 ? (observedProd * 0.7) + (histProd * 0.3) : observedProd || histProd || 25;
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

function buildServiceRecap(rows: GenericRow[]) {
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

function buildWeekdayAverages(rows: GenericRow[]) {
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

function buildPortFocus(rows: GenericRow[], field: "last_port" | "next_port") {
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

function buildExploitantsBreakdown(row: GenericRow) {
  return [
    { name: "CMA CGM", value: toNumber(row.exp_cma_total), color: "#0f766e" },
    { name: "MSC", value: toNumber(row.exp_msk_total), color: "#3b82f6" },
    { name: "Hapag-Lloyd", value: toNumber(row.exp_hlc_total), color: "#f59e0b" },
    { name: "MGS", value: toNumber(row.exp_mgs_total), color: "#8b5cf6" },
  ].filter((item) => item.value > 0);
}

function buildParkFamilyMix(row: GenericRow) {
  const standard = toNumber(row.total_20std) + toNumber(row.total_40std) + toNumber(row.total_40htc);
  const special = toNumber(row.total_20spe) + toNumber(row.total_40spe);
  const reefer = toNumber(row.total_20rf) + toNumber(row.total_40rf);
  return [
    { name: "Standard & HC", value: standard, color: "#3b82f6" },
    { name: "Speciaux", value: special, color: "#f59e0b" },
    { name: "Reefers", value: reefer, color: "#8b5cf6" },
  ].filter((item) => item.value > 0);
}

function buildOccupationPie(row: GenericRow) {
  return [
    { name: "Occupe", value: toNumber(row.parc_conteneurs_utilise), color: "#10b981" },
    { name: "Disponible", value: toNumber(row.parc_conteneurs_disponible), color: "#334155" },
  ].filter((item) => item.value > 0);
}

function buildReeferPie(row: GenericRow) {
  return [
    { name: "RF utilises", value: toNumber(row.reefers_utilises), color: "#8b5cf6" },
    { name: "RF disponibles", value: toNumber(row.reefers_disponibles), color: "#334155" },
  ].filter((item) => item.value > 0);
}

function buildFlowMix(row: GenericRow) {
  return [
    { name: "Import", value: toNumber(row.import_teu) },
    { name: "Export", value: toNumber(row.export_teu) },
    { name: "Transbo", value: toNumber(row.transbo_teu) },
    { name: "Vides", value: toNumber(row.vides_teu) },
  ];
}

function buildArmateurProgress(row: GenericRow) {
  return [
    { name: "CMA CGM", planned: toNumber(row.escales_cma_cgm_prevues), done: toNumber(row.escales_cma_cgm_realisees), color: "#0f766e" },
    { name: "MSC", planned: toNumber(row.escales_msc_prevues), done: toNumber(row.escales_msc_realisees), color: "#3b82f6" },
    { name: "Hapag-Lloyd", planned: toNumber(row.escales_hapag_lloyd_prevues), done: toNumber(row.escales_hapag_lloyd_realisees), color: "#f59e0b" },
    { name: "Maersk", planned: toNumber(row.escales_maersk_prevues), done: toNumber(row.escales_maersk_realisees), color: "#06b6d4" },
    { name: "Autres", planned: toNumber(row.escales_autres_prevues), done: toNumber(row.escales_autres_realisees), color: "#64748b" },
  ].filter((item) => item.planned > 0 || item.done > 0);
}

function buildArmateurEscalesPie(row: GenericRow) {
  return [
    { name: "CMA CGM", value: toNumber(row.escales_cma_cgm_realisees), color: "#0f766e" },
    { name: "MSC", value: toNumber(row.escales_msc_realisees), color: "#3b82f6" },
    { name: "Hapag-Lloyd", value: toNumber(row.escales_hapag_lloyd_realisees), color: "#f59e0b" },
    { name: "Maersk", value: toNumber(row.escales_maersk_realisees), color: "#06b6d4" },
  ].filter((item) => item.value > 0);
}

function buildShippingPerformance(rows: GenericRow[]) {
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

function getShippingBucket(value: unknown): "CMA" | "MSC" | "HLC" | "MSK" | "MGS" | "OTHER" {
  const text = toText(value, "").toUpperCase();
  if (text.includes("CMA")) return "CMA";
  if (text.includes("MSC")) return "MSC";
  if (text.includes("HLC") || text.includes("HAPAG")) return "HLC";
  if (text.includes("MAERSK") || text.includes("MSK")) return "MSK";
  if (text.includes("MGS") || text.includes("MARGUISA")) return "MGS";
  return "OTHER";
}

function buildYardLineRows(
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

function buildSituationEscaleRows(rows: GenericRow[]) {
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

function buildCumul2026MonthlyRows(
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
      const nbGateDays = Math.max(activeGate.length, 1);
      const gateDayCount = gateMonth.length;
      const gateDayDivisor = Math.max(gateDayCount, 1);

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
        tttAvg: tttSum / nbGateDays,
        camionsAvgJour: camionsSum / gateDayDivisor,
        mouvementsAvgJour: mvtSum / gateDayDivisor,
        entreesTotalAvgJour: (epSum + evSum) / gateDayDivisor,
        sortiesPleinAvgJour: spSum / gateDayDivisor,
        sortiesVideAvgJour: svSum / gateDayDivisor,
        sortiesTotalAvgJour: (spSum + svSum) / gateDayDivisor,
        entreesPleinAvgJour: epSum / gateDayDivisor,
        entreesVideAvgJour: evSum / gateDayDivisor,
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

function buildCumul2026ShippingRows(rows: GenericRow[], targetYear: number): ShippingMonthRow[] {
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

function buildYearWeekdayHeatmapRows(rows: GenericRow[], targetYear: number): WeekdayHeatmapRow[] {
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

function buildMonthlyBulletin(dailyRows: GenericRow[], gateRows: GenericRow[]): BulletinMonthRow[] {
  const gateByDate = new Map<string, GenericRow>();
  for (const row of gateRows) gateByDate.set(buildRowKey(row), row);

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
    const gate = gateByDate.get(buildRowKey(row)) ?? {};
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

/* ───────── Sub-components ───────── */

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--badge-bg)] px-2.5 py-1 text-[12px] font-medium text-[var(--cyan)]">
      {label}
      <button type="button" onClick={onClear} className="rounded-full p-0.5 hover:bg-[var(--surface-hover)]">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function FilterSelect({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-[var(--card-border)] bg-[var(--input-bg)] px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none transition focus:border-[var(--cyan)]/40 focus:ring-1 focus:ring-[var(--cyan)]/20"
    >
      {children}
    </select>
  );
}

function LoadingOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-1 overflow-hidden bg-transparent">
        <div className="h-full w-full animate-pulse bg-gradient-to-r from-cyan-400 via-emerald-400 to-cyan-400 shadow-[0_0_18px_rgba(34,211,238,0.8)]" />
      </div>
      <div className="pointer-events-none fixed right-6 top-6 z-50 animate-in fade-in">
        <div className="flex items-center gap-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-2.5 text-sm text-[var(--cyan)] shadow-xl backdrop-blur-md">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          <span>Recalcul du modele en cours...</span>
        </div>
      </div>
    </>
  );
}

function ProgressBar({ label, done, planned, color }: { label: string; done: number; planned: number; color: string }) {
  const ratio = planned ? Math.min(100, (done / planned) * 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-[var(--text-primary)]">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-[var(--text-secondary)]">{done}/{planned}</span>
          <span className="font-mono text-sm font-bold" style={{ color }}>{ratio.toFixed(0)}%</span>
        </div>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-muted)]">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${ratio}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function HeatCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: number;
}) {
  const opacity = 0.12 + Math.max(0, Math.min(1, tone)) * 0.55;
  return (
    <div
      className="rounded-xl border border-[var(--card-border)] p-3"
      style={{ backgroundColor: `rgba(14, 165, 233, ${opacity})` }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

function WeekdayHeatmap({ rows }: { rows: WeekdayHeatmapRow[] }) {
  const maxTtt = Math.max(...rows.map((row) => row.tttAverage), 0);
  const maxCamions = Math.max(...rows.map((row) => row.camionsAverage), 0);

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.dayName} className="grid gap-3 md:grid-cols-[180px_1fr_1fr] md:items-center">
          <div className="text-sm font-medium text-[var(--text-primary)]">{row.dayName}</div>
          <HeatCell
            label="TTT moyen"
            value={formatMinutes(row.tttAverage)}
            tone={maxTtt > 0 ? row.tttAverage / maxTtt : 0}
          />
          <HeatCell
            label="Camions moyens"
            value={formatInteger(row.camionsAverage)}
            tone={maxCamions > 0 ? row.camionsAverage / maxCamions : 0}
          />
        </div>
      ))}
    </div>
  );
}

/* ── Insight rendering ── */

const INSIGHT_ICONS: Record<InsightLevel, React.ComponentType<{ className?: string }>> = {
  critical: XCircle,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle2,
};

const INSIGHT_COLORS: Record<InsightLevel, string> = {
  critical: "#f43f5e",
  warning: "#f59e0b",
  info: "#3b82f6",
  success: "#10b981",
};

function InsightCard({ insight }: { insight: Insight }) {
  const Icon = INSIGHT_ICONS[insight.level];
  const color = INSIGHT_COLORS[insight.level];
  return (
    <div className={`insight-card insight-${insight.level} flex gap-3`}>
      <span className="flex-shrink-0 mt-0.5" style={{ color }}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold" style={{ color }}>{insight.title}</p>
        <p className="mt-0.5 text-[12px] text-[var(--text-secondary)]">{insight.description}</p>
        {insight.category && (
          <span className="mt-1.5 inline-block rounded-md bg-[var(--surface-hover)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            {insight.category}
          </span>
        )}
      </div>
    </div>
  );
}

function CorrelationBadge({ value }: { value: number }) {
  const abs = Math.abs(value);
  const label = abs > 0.7 ? "Fort" : abs > 0.4 ? "Modere" : "Faible";
  const color = abs > 0.7 ? "#10b981" : abs > 0.4 ? "#f59e0b" : "#64748b";
  return (
    <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium" style={{ color, backgroundColor: `${color}15` }}>
      r = {value.toFixed(2)} ({label})
    </span>
  );
}

function DataBadge({ type }: { type: "jour" | "cumul-mois" | "moy-mois" | "cumul-annuel" | "moy-annuel" | "tendance" }) {
  const config: Record<string, { label: string; color: string; backgroundColor: string }> = {
    "jour": { label: "Jour", color: "var(--cyan)", backgroundColor: "rgba(34, 211, 238, 0.14)" },
    "cumul-mois": { label: "Cumul mois", color: "var(--emerald)", backgroundColor: "rgba(16, 185, 129, 0.14)" },
    "moy-mois": { label: "Moy. mois", color: "var(--blue)", backgroundColor: "rgba(59, 130, 246, 0.14)" },
    "cumul-annuel": { label: "Cumul annuel", color: "var(--violet)", backgroundColor: "rgba(139, 92, 246, 0.14)" },
    "moy-annuel": { label: "Moy. annuel", color: "var(--amber)", backgroundColor: "rgba(245, 158, 11, 0.14)" },
    "tendance": { label: "Tendance", color: "var(--rose)", backgroundColor: "rgba(244, 63, 94, 0.14)" },
  };
  const c = config[type] ?? config["jour"];
  return (
    <span
      className="inline-block rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
      style={{ color: c.color, backgroundColor: c.backgroundColor }}
    >
      {c.label}
    </span>
  );
}

function AnalyseSubTab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-[13px] font-medium transition ${
        active ? "bg-[var(--badge-bg)] text-[var(--cyan)]" : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
      }`}
    >
      {label}
    </button>
  );
}

/* ───────── Bulletin Manager ───────── */

function BulletinManager({ onDeleted }: { onDeleted: () => void }) {
  const [bulletins, setBulletins] = useState<GenericRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchBulletins = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bulletin");
      const data = await res.json();
      setBulletins(data.data || []);
    } catch {
      setError("Erreur de chargement des bulletins");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBulletins(); }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/bulletin", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rapportId: deleteTarget, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur");
        return;
      }
      setSuccess(data.message);
      setDeleteTarget(null);
      setPassword("");
      await fetchBulletins();
      onDeleted();
    } catch {
      setError("Erreur reseau");
    }
  };

  const duplicates = bulletins.filter((b) => toNumber(b.date_count) > 1);

  return (
    <div className="space-y-4">
      {duplicates.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-[13px] font-semibold text-amber-500">
            {duplicates.length} bulletin(s) en doublon detecte(s)
          </p>
          <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
            Dates concernees : {[...new Set(duplicates.map((b) => formatDateLabel(b.date_rapport)))].join(", ")}
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-[13px] text-red-500">{error}</div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-[13px] text-emerald-500">{success}</div>
      )}

      {loading ? (
        <p className="text-[13px] text-[var(--text-muted)]">Chargement...</p>
      ) : (
        <div className="overflow-auto rounded-xl border border-[var(--card-border)]" style={{ maxHeight: "400px" }}>
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-[var(--surface-muted)]">
              <tr>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Date</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Doc</th>
                <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">App.</th>
                <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Op.</th>
                <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Att.</th>
                <th className="px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Doublon</th>
                <th className="px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Action</th>
              </tr>
            </thead>
            <tbody>
              {bulletins.map((b) => {
                const isDuplicate = toNumber(b.date_count) > 1;
                const rapportId = toText(b.rapport_id, "");
                return (
                  <tr key={rapportId} className={`border-b border-[var(--line)] transition-colors ${isDuplicate ? "bg-amber-500/5" : "hover:bg-[var(--surface-hover)]"}`}>
                    <td className="px-3 py-2 text-[var(--text-primary)]">{formatDateLabel(b.date_rapport)}</td>
                    <td className="px-3 py-2 text-[var(--text-secondary)] text-[12px]">{toText(b.document_numero, "—")}</td>
                    <td className="px-3 py-2 text-right font-mono text-[var(--text-primary)]">{toNumber(b.nb_navires_appareilles)}</td>
                    <td className="px-3 py-2 text-right font-mono text-[var(--text-primary)]">{toNumber(b.nb_navires_en_operation)}</td>
                    <td className="px-3 py-2 text-right font-mono text-[var(--text-primary)]">{toNumber(b.nb_navires_attendus)}</td>
                    <td className="px-3 py-2 text-center">
                      {isDuplicate && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-500">x{toNumber(b.date_count)}</span>}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {deleteTarget === rapportId ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Mot de passe"
                            className="w-24 rounded border border-[var(--card-border)] bg-[var(--input-bg)] px-2 py-1 text-[12px] text-[var(--text-primary)] outline-none"
                          />
                          <button type="button" onClick={handleDelete} className="rounded bg-red-500/15 px-2 py-1 text-[11px] font-medium text-red-500 hover:bg-red-500/25">OK</button>
                          <button type="button" onClick={() => { setDeleteTarget(null); setPassword(""); }} className="rounded bg-[var(--surface-hover)] px-2 py-1 text-[11px] text-[var(--text-muted)]">X</button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(rapportId)}
                          className="rounded bg-red-500/10 px-2.5 py-1 text-[11px] font-medium text-red-500 hover:bg-red-500/20 transition"
                        >
                          Supprimer
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ───────── Main component ───────── */

export default function DashboardClient({
  filterOptions,
  initialData,
  initialTab = "situation",
  initialSegment = "global",
  visibleMenuItems,
  serverError = null,
}: {
  filterOptions: FilterOptions;
  initialData: InitialData;
  initialTab?: MainTabId;
  initialSegment?: SegmentId;
  visibleMenuItems?: MenuEntryId[];
  serverError?: string | null;
}) {
  const router = useRouter();
  const pakazureLogo = "https://static.wixstatic.com/media/ccfac3_e82eb7f271cb42709c78ae85c0aaf01f~mv2.jpg/v1/fill/w_144,h_122,al_c,q_80,usm_0.66_1.00_0.01,enc_avif,quality_auto/PAKAZURE_JPG.jpg";

  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [shipping, setShipping] = useState("");
  const [activeTab, setActiveTab] = useState<MainTabId>(initialTab);
  const [activeSegment, setActiveSegment] = useState<SegmentId>(initialSegment);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [dashboardData, setDashboardData] = useState<InitialData>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isPngExporting, setIsPngExporting] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const handlePngExportStart = () => setIsPngExporting(true);
    const handlePngExportEnd = () => setIsPngExporting(false);
    window.addEventListener("port-pulse:png-export-start", handlePngExportStart);
    window.addEventListener("port-pulse:png-export-end", handlePngExportEnd);
    return () => {
      window.removeEventListener("port-pulse:png-export-start", handlePngExportStart);
      window.removeEventListener("port-pulse:png-export-end", handlePngExportEnd);
    };
  }, []);

  /* ── Fetch filtered data ── */
  useEffect(() => {
    const hasFilters = Boolean(year || month || day || shipping);
    if (!hasFilters) { setDashboardData(initialData); return; }

    const params = new URLSearchParams();
    if (year) params.set("year", year);
    if (month) params.set("month", month);
    if (day) params.set("day", day);
    if (shipping) {
      const opt = filterOptions.shippingLines.find((o) => o.value === shipping);
      if (opt) params.set("shippingIn", opt.aliases.join(","));
    }
    const dateBounds = getDateBounds(year, month, day);
    if (dateBounds) { params.set("startDate", dateBounds.startDate); params.set("endDate", dateBounds.endDate); }

    const qs = params.toString();
    const controller = new AbortController();

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [dailyRes, monthlyRes, perfRes, gateRes, armRes, expRes, attRes, appRes, opRes, escRes, parcRes, rapRes, kpiRes] =
          await Promise.all([
            fetch(`/api/data/v_kct_daily?limit=400&orderBy=date_rapport&orderDir=DESC&${qs}`, { signal: controller.signal }).then((r) => r.json()),
            fetch(`/api/data/v_kct_monthly?limit=18&orderBy=annee_mois&orderDir=DESC&${qs}`, { signal: controller.signal }).then((r) => r.json()),
            fetch(`/api/data/v_navires_performance?limit=1000&orderBy=date_rapport&orderDir=DESC&${qs}`, { signal: controller.signal }).then((r) => r.json()),
            fetch(`/api/data/kct_gate_ttt?limit=400&orderBy=date_rapport&orderDir=DESC&${qs}`, { signal: controller.signal }).then((r) => r.json()),
            fetch(`/api/data/kct_escales_armateurs?limit=400&orderBy=date_rapport&orderDir=DESC&${qs}`, { signal: controller.signal }).then((r) => r.json()),
            fetch(`/api/data/kct_exploitants_parc?limit=120&orderBy=date_rapport&orderDir=DESC&${qs}`, { signal: controller.signal }).then((r) => r.json()),
            fetch(`/api/data/kct_navires_attendus?limit=120&orderBy=date_rapport&orderDir=DESC&${qs}`, { signal: controller.signal }).then((r) => r.json()),
            fetch(`/api/data/kct_navires_appareilles?limit=1000&orderBy=date_rapport&orderDir=DESC&${qs}`, { signal: controller.signal }).then((r) => r.json()),
            fetch(`/api/data/kct_navires_operation?limit=120&orderBy=date_rapport&orderDir=DESC&${qs}`, { signal: controller.signal }).then((r) => r.json()),
            fetch(`/api/data/kct_operations_escales?limit=200&orderBy=date_rapport&orderDir=DESC&${qs}`, { signal: controller.signal }).then((r) => r.json()),
            fetch(`/api/data/kct_parc_conteneurs?limit=120&orderBy=date_rapport&orderDir=DESC&${qs}`, { signal: controller.signal }).then((r) => r.json()),
            fetch(`/api/data/kct_rapport_quotidien?limit=120&orderBy=date_rapport&orderDir=DESC&${qs}`, { signal: controller.signal }).then((r) => r.json()),
            fetch(`/api/data/kct_kpis?limit=120&orderBy=date_rapport&orderDir=DESC&${qs}`, { signal: controller.signal }).then((r) => r.json()),
          ]);
        startTransition(() => {
          setDashboardData({
            dailyData: (dailyRes.data || []).reverse(),
            monthlyData: (monthlyRes.data || []).reverse(),
            naviresPerformance: perfRes.data || [],
            gateData: (gateRes.data || []).reverse(),
            armateursData: (armRes.data || []).reverse(),
            exploitantsData: (expRes.data || []).reverse(),
            naviresAttendus: attRes.data || [],
            naviresAppareilles: appRes.data || [],
            naviresOperation: opRes.data || [],
            operationsEscales: escRes.data || [],
            parcConteneurs: (parcRes.data || []).reverse(),
            rapportQuotidien: (rapRes.data || []).reverse(),
            kpisData: (kpiRes.data || []).reverse(),
          });
        });
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) console.error("Fetch error", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
    return () => controller.abort();
  }, [day, filterOptions.shippingLines, initialData, month, shipping, year]);

  useEffect(() => {
    const now = new Date();
    const nextRefresh = new Date(now);
    nextRefresh.setHours(DAILY_REFRESH_HOUR, 0, 0, 0);
    if (nextRefresh <= now) nextRefresh.setDate(nextRefresh.getDate() + 1);
    let intervalId: number | undefined;

    const timeout = window.setTimeout(() => {
      router.refresh();
      intervalId = window.setInterval(() => router.refresh(), 24 * 60 * 60 * 1000);
    }, nextRefresh.getTime() - now.getTime());

    return () => {
      window.clearTimeout(timeout);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [router]);

  /* ── Derived data ── */
  const latestDaily = useMemo(() => dashboardData.dailyData[dashboardData.dailyData.length - 1] ?? {}, [dashboardData.dailyData]);
  const latestGate = useMemo(() => dashboardData.gateData[dashboardData.gateData.length - 1] ?? latestDaily, [dashboardData.gateData, latestDaily]);
  const latestArmateurs = useMemo(() => dashboardData.armateursData[dashboardData.armateursData.length - 1] ?? {}, [dashboardData.armateursData]);
  const latestExploitants = useMemo(() => dashboardData.exploitantsData[dashboardData.exploitantsData.length - 1] ?? latestDaily, [dashboardData.exploitantsData, latestDaily]);
  const latestParc = useMemo(() => dashboardData.parcConteneurs[dashboardData.parcConteneurs.length - 1] ?? latestDaily, [dashboardData.parcConteneurs, latestDaily]);
  const latestKpi = useMemo(() => dashboardData.kpisData[dashboardData.kpisData.length - 1] ?? latestDaily, [dashboardData.kpisData, latestDaily]);

  const serviceRecap = useMemo(() => buildServiceRecap(dashboardData.naviresPerformance), [dashboardData.naviresPerformance]);
  const weekdayAverages = useMemo(() => buildWeekdayAverages(dashboardData.dailyData), [dashboardData.dailyData]);
  const flowMix = useMemo(() => buildFlowMix(latestDaily), [latestDaily]);
  const portOrigins = useMemo(() => buildPortFocus(dashboardData.naviresAttendus, "last_port"), [dashboardData.naviresAttendus]);
  const portDestinations = useMemo(() => buildPortFocus(dashboardData.naviresAttendus, "next_port"), [dashboardData.naviresAttendus]);
  const exploitantsBreakdown = useMemo(() => buildExploitantsBreakdown(latestExploitants), [latestExploitants]);
  const parkFamilyMix = useMemo(() => buildParkFamilyMix(latestExploitants), [latestExploitants]);
  const armateurEscalesPie = useMemo(() => buildArmateurEscalesPie(latestArmateurs), [latestArmateurs]);
  const armateurProgress = useMemo(() => buildArmateurProgress(latestArmateurs), [latestArmateurs]);
  const monthlyBulletin = useMemo(() => buildMonthlyBulletin(dashboardData.dailyData, dashboardData.gateData), [dashboardData.dailyData, dashboardData.gateData]);
  const bulletinHeadline = monthlyBulletin[monthlyBulletin.length - 1];
  const budgetGap = toNumber(latestDaily.total_teu) - toNumber(latestDaily.total_forecast);
  const selectedCumulYear = useMemo(() => Number(year || (filterOptions.years.includes(2026) ? 2026 : filterOptions.years[0] ?? new Date().getUTCFullYear())), [filterOptions.years, year]);
  const completedCalls = useMemo(
    () => buildCompletedCalls(dashboardData.naviresAppareilles, dashboardData.naviresOperation, selectedCumulYear),
    [dashboardData.naviresAppareilles, dashboardData.naviresOperation, selectedCumulYear],
  );
  const cumul2026Monthly = useMemo(
    () => buildCumul2026MonthlyRows(dashboardData.dailyData, dashboardData.gateData, dashboardData.naviresPerformance, dashboardData.armateursData, selectedCumulYear),
    [dashboardData.armateursData, dashboardData.dailyData, dashboardData.gateData, dashboardData.naviresPerformance, selectedCumulYear],
  );
  const monthlyTrafficRows = useMemo(() => buildMonthlyTrafficRows(cumul2026Monthly), [cumul2026Monthly]);
  const cumul2026Shipping = useMemo(
    () => buildCompletedCallShippingMonthlyRows(completedCalls),
    [completedCalls],
  );
  const cumul2026WeekdayHeatmap = useMemo(
    () => buildYearWeekdayHeatmapRows(dashboardData.gateData, selectedCumulYear),
    [dashboardData.gateData, selectedCumulYear],
  );
  const completedShippingStats = useMemo(() => buildCompletedCallShippingStats(completedCalls), [completedCalls]);
  const completedLoaStats = useMemo(() => buildCompletedCallLoaStats(completedCalls), [completedCalls]);
  const monthlyCycleRows = useMemo(() => buildMonthlyCycleRows(completedCalls), [completedCalls]);
  const shippingProductivityMonthly = useMemo(() => buildMonthlyProductivityByShipping(completedCalls), [completedCalls]);
  const loaProductivityMonthly = useMemo(() => buildMonthlyProductivityByLoa(completedCalls), [completedCalls]);
  const shippingCycleChartRows = useMemo(
    () => completedShippingStats.slice(0, 8).map((row) => ({
      shipping: row.shipping,
      waitHours: row.waitHours,
      operationHours: row.operationHours,
      postOpsHours: Math.max(row.totalCycleHours - row.quayHours, 0),
      totalCycleHours: row.totalCycleHours,
      escales: row.escales,
    })),
    [completedShippingStats],
  );
  const loaCycleChartRows = useMemo(
    () => completedLoaStats.map((row) => ({
      loaBucket: row.loaBucket,
      waitHours: row.waitHours,
      operationHours: row.operationHours,
      postOpsHours: Math.max(row.totalCycleHours - row.quayHours, 0),
      totalCycleHours: row.totalCycleHours,
      escales: row.escales,
    })),
    [completedLoaStats],
  );
  const completedShippingPie = useMemo(
    () => completedShippingStats.map((row, index) => ({ name: row.shipping, value: row.escales, color: FLOW_COLORS[index % FLOW_COLORS.length] })),
    [completedShippingStats],
  );
  const cumul2026Annual = useMemo(() => {
    const monthCount = cumul2026Monthly.length || 1;
    const totalDailyCount = cumul2026Monthly.reduce((s, r) => s + r.occupancyDayCount, 0) || 1;
    const totalGateDays = cumul2026Monthly.reduce((s, r) => s + r.gateDayCount, 0) || 1;
    const totalObservedTttDays = cumul2026Monthly.reduce((s, r) => s + r.tttObservedDays, 0) || 1;
    const totalProductivityCount = cumul2026Monthly.reduce((s, r) => s + r.productivityCount, 0) || 1;
    const totalTeu = cumul2026Monthly.reduce((s, r) => s + r.totalTeu, 0);
    const totalForecast = cumul2026Monthly.reduce((s, r) => s + r.totalForecast, 0);
    return {
      totalTeu,
      importTeu: cumul2026Monthly.reduce((s, r) => s + r.importTeu, 0),
      exportTeu: cumul2026Monthly.reduce((s, r) => s + r.exportTeu, 0),
      transboTeu: cumul2026Monthly.reduce((s, r) => s + r.transboTeu, 0),
      pleinsTeu: cumul2026Monthly.reduce((s, r) => s + r.pleinsTeu, 0),
      videsTeu: cumul2026Monthly.reduce((s, r) => s + r.videsTeu, 0),
      totalForecast,
      escalesRealisees: cumul2026Monthly.reduce((s, r) => s + r.escalesRealisees, 0),
      gateEntreesPleins: cumul2026Monthly.reduce((s, r) => s + r.gateEntreesPleins, 0),
      gateEntreesVides: cumul2026Monthly.reduce((s, r) => s + r.gateEntreesVides, 0),
      gateSortiesPleins: cumul2026Monthly.reduce((s, r) => s + r.gateSortiesPleins, 0),
      gateSortiesVides: cumul2026Monthly.reduce((s, r) => s + r.gateSortiesVides, 0),
      totalCamions: cumul2026Monthly.reduce((s, r) => s + r.totalCamions, 0),
      totalMouvements: cumul2026Monthly.reduce((s, r) => s + (r.mouvementsAvgJour * r.gateDayCount), 0),
      tauxRealisationLast: totalForecast > 0 ? (totalTeu / totalForecast) * 100 : 0,
      occupationAvg: cumul2026Monthly.reduce((s, r) => s + (r.occupationAvg * r.occupancyDayCount), 0) / totalDailyCount,
      reefersAvg: cumul2026Monthly.reduce((s, r) => s + (r.reefersAvg * r.occupancyDayCount), 0) / totalDailyCount,
      tttAvg: cumul2026Monthly.reduce((s, r) => s + (r.tttAvg * r.tttObservedDays), 0) / totalObservedTttDays,
      camionsAvgJour: cumul2026Monthly.reduce((s, r) => s + (r.camionsAvgJour * r.gateDayCount), 0) / totalGateDays,
      mouvementsAvgJour: cumul2026Monthly.reduce((s, r) => s + (r.mouvementsAvgJour * r.gateDayCount), 0) / totalGateDays,
      entreesTotalAvgJour: cumul2026Monthly.reduce((s, r) => s + (r.entreesTotalAvgJour * r.gateDayCount), 0) / totalGateDays,
      sortiesTotalAvgJour: cumul2026Monthly.reduce((s, r) => s + (r.sortiesTotalAvgJour * r.gateDayCount), 0) / totalGateDays,
      sortiesPleinAvgJour: cumul2026Monthly.reduce((s, r) => s + (r.sortiesPleinAvgJour * r.gateDayCount), 0) / totalGateDays,
      sortiesVideAvgJour: cumul2026Monthly.reduce((s, r) => s + (r.sortiesVideAvgJour * r.gateDayCount), 0) / totalGateDays,
      entreesPleinAvgJour: cumul2026Monthly.reduce((s, r) => s + (r.entreesPleinAvgJour * r.gateDayCount), 0) / totalGateDays,
      entreesVideAvgJour: cumul2026Monthly.reduce((s, r) => s + (r.entreesVideAvgJour * r.gateDayCount), 0) / totalGateDays,
      productivityAverage: cumul2026Monthly.reduce((s, r) => s + (r.productivityAverage * r.productivityCount), 0) / totalProductivityCount,
      monthCount,
      totalGateDays,
    };
  }, [cumul2026Monthly]);
  const cumul2026ShippingAnnual = useMemo(() => {
    const map = new Map<string, { shipping: string; escales: number; units: number; prodSum: number; prodCount: number }>();
    for (const row of cumul2026Shipping) {
      const entry = map.get(row.shipping) ?? { shipping: row.shipping, escales: 0, units: 0, prodSum: 0, prodCount: 0 };
      entry.escales += row.escales;
      entry.units += row.units;
      entry.prodSum += row.productivity * row.escales;
      entry.prodCount += row.escales;
      map.set(row.shipping, entry);
    }
    return Array.from(map.values())
      .map((entry) => ({
        shipping: entry.shipping,
        escales: entry.escales,
        units: entry.units,
        productivity: entry.prodCount ? entry.prodSum / entry.prodCount : 0,
      }))
      .sort((a, b) => b.escales - a.escales);
  }, [cumul2026Shipping]);
  const latestDashboardDate = useMemo(() => getLatestDateFromRows([
    ...dashboardData.dailyData,
    ...dashboardData.gateData,
    ...dashboardData.armateursData,
    ...dashboardData.exploitantsData,
    ...dashboardData.naviresPerformance,
    ...dashboardData.naviresAttendus,
    ...dashboardData.naviresAppareilles,
    ...dashboardData.naviresOperation,
    ...dashboardData.operationsEscales,
    ...dashboardData.parcConteneurs,
    ...dashboardData.rapportQuotidien,
    ...dashboardData.kpisData,
  ]), [dashboardData]);
  const yearScopedDailyData = useMemo(
    () => filterRowsSinceYearStart(dashboardData.dailyData, selectedCumulYear),
    [dashboardData.dailyData, selectedCumulYear],
  );
  const yearScopedGateData = useMemo(
    () => filterRowsSinceYearStart(dashboardData.gateData, selectedCumulYear),
    [dashboardData.gateData, selectedCumulYear],
  );
  const yearScopedArmateursData = useMemo(
    () => filterRowsSinceYearStart(dashboardData.armateursData, selectedCumulYear),
    [dashboardData.armateursData, selectedCumulYear],
  );
  const yearScopedExploitantsData = useMemo(
    () => filterRowsSinceYearStart(dashboardData.exploitantsData, selectedCumulYear),
    [dashboardData.exploitantsData, selectedCumulYear],
  );
  const yearScopedKpisData = useMemo(
    () => filterRowsSinceYearStart(dashboardData.kpisData, selectedCumulYear),
    [dashboardData.kpisData, selectedCumulYear],
  );
  const yearScopedParcData = useMemo(
    () => filterRowsSinceYearStart(dashboardData.parcConteneurs, selectedCumulYear),
    [dashboardData.parcConteneurs, selectedCumulYear],
  );
  const yearScopedRapportData = useMemo(
    () => filterRowsSinceYearStart(dashboardData.rapportQuotidien, selectedCumulYear),
    [dashboardData.rapportQuotidien, selectedCumulYear],
  );

  const situationDailyRows = useMemo(() => getLatestRows(dashboardData.dailyData), [dashboardData.dailyData]);
  const situationGateRows = useMemo(() => getLatestRows(dashboardData.gateData), [dashboardData.gateData]);
  const situationParcRows = useMemo(() => getLatestRows(dashboardData.parcConteneurs), [dashboardData.parcConteneurs]);
  const situationKpiRows = useMemo(() => getLatestRows(dashboardData.kpisData), [dashboardData.kpisData]);
  const situationPerformanceRows = useMemo(() => getLatestRows(dashboardData.naviresPerformance), [dashboardData.naviresPerformance]);

  // Situation: date selector for picking a specific bulletin day
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    for (const row of [...dashboardData.dailyData, ...dashboardData.rapportQuotidien]) {
      const d = normalizeDateValue(resolveRowDate(row));
      if (d) dates.add(d);
    }
    return Array.from(dates).sort().reverse();
  }, [dashboardData.dailyData, dashboardData.rapportQuotidien]);

  const [selectedSituationDate, setSelectedSituationDate] = useState("");
  const effectiveSituationDate = selectedSituationDate || availableDates[0] || latestDashboardDate;

  const situationDateRows = useMemo(() => filterRowsByDate(dashboardData.dailyData, effectiveSituationDate), [dashboardData.dailyData, effectiveSituationDate]);
  const situationDateGateRows = useMemo(() => filterRowsByDate(dashboardData.gateData, effectiveSituationDate), [dashboardData.gateData, effectiveSituationDate]);
  const situationDateParcRows = useMemo(() => filterRowsByDate(dashboardData.parcConteneurs, effectiveSituationDate), [dashboardData.parcConteneurs, effectiveSituationDate]);
  const situationDateKpiRows = useMemo(() => filterRowsByDate(dashboardData.kpisData, effectiveSituationDate), [dashboardData.kpisData, effectiveSituationDate]);
  const situationDateExploitantsRows = useMemo(() => filterRowsByDate(dashboardData.exploitantsData, effectiveSituationDate), [dashboardData.exploitantsData, effectiveSituationDate]);
  const situationDateArmateursRows = useMemo(() => filterRowsByDate(dashboardData.armateursData, effectiveSituationDate), [dashboardData.armateursData, effectiveSituationDate]);
  const situationDatePerformanceRows = useMemo(() => filterRowsByDate(dashboardData.naviresPerformance, effectiveSituationDate), [dashboardData.naviresPerformance, effectiveSituationDate]);
  const situationDateAttendusRows = useMemo(() => filterRowsByDate(dashboardData.naviresAttendus, effectiveSituationDate), [dashboardData.naviresAttendus, effectiveSituationDate]);
  const situationDateAppareillesRows = useMemo(() => filterRowsByDate(dashboardData.naviresAppareilles, effectiveSituationDate), [dashboardData.naviresAppareilles, effectiveSituationDate]);
  const situationDateOperationRows = useMemo(() => filterRowsByDate(dashboardData.naviresOperation, effectiveSituationDate), [dashboardData.naviresOperation, effectiveSituationDate]);
  const situationDateEscalesRows = useMemo(() => filterRowsByDate(dashboardData.operationsEscales, effectiveSituationDate), [dashboardData.operationsEscales, effectiveSituationDate]);
  const situationReport = useMemo(
    () => getLatestReportRow(dashboardData.rapportQuotidien, effectiveSituationDate),
    [dashboardData.rapportQuotidien, effectiveSituationDate],
  );

  const situationDaily = situationDateRows[situationDateRows.length - 1] ?? situationDailyRows[situationDailyRows.length - 1] ?? latestDaily;
  const situationGate = situationDateGateRows[situationDateGateRows.length - 1] ?? situationGateRows[situationGateRows.length - 1] ?? latestGate;
  const situationParc = situationDateParcRows[situationDateParcRows.length - 1] ?? situationParcRows[situationParcRows.length - 1] ?? latestParc;
  const situationKpi = situationDateKpiRows[situationDateKpiRows.length - 1] ?? situationKpiRows[situationKpiRows.length - 1] ?? latestKpi;
  const situationExploitants = situationDateExploitantsRows[situationDateExploitantsRows.length - 1] ?? latestExploitants;
  const situationArmateurs = situationDateArmateursRows[situationDateArmateursRows.length - 1] ?? latestArmateurs;
  const previousParc = dashboardData.parcConteneurs[dashboardData.parcConteneurs.length - 2] ?? {};
  const occupationPie = useMemo(() => buildOccupationPie(situationParc), [situationParc]);
  const reeferPie = useMemo(() => buildReeferPie(situationParc), [situationParc]);
  const situationAttendus = situationDateAttendusRows.length > 0 ? situationDateAttendusRows : getLatestRows(dashboardData.naviresAttendus);
  const situationAppareilles = situationDateAppareillesRows.length > 0 ? situationDateAppareillesRows : getLatestRows(dashboardData.naviresAppareilles);
  const situationOperation = situationDateOperationRows.length > 0 ? situationDateOperationRows : getLatestRows(dashboardData.naviresOperation);
  const situationPerf = situationDatePerformanceRows.length > 0 ? situationDatePerformanceRows : situationPerformanceRows;
  const situationEscales = useMemo(
    () => buildSituationEscaleRows(situationDateEscalesRows.length > 0 ? situationDateEscalesRows : getLatestRows(dashboardData.operationsEscales)),
    [dashboardData.operationsEscales, situationDateEscalesRows],
  );
  const shippingPerformance = useMemo(() => buildShippingPerformance(situationPerf), [situationPerf]);
  const yardLineRows = useMemo(
    () => buildYardLineRows(situationExploitants, situationPerf, situationAttendus, situationOperation, situationAppareilles, situationEscales),
    [situationAppareilles, situationAttendus, situationEscales, situationExploitants, situationOperation, situationPerf],
  );
  const occupancyTrend = useMemo(
    () => buildParcTrendRows(dashboardData.parcConteneurs, selectedCumulYear),
    [dashboardData.parcConteneurs, selectedCumulYear],
  );
  const gateFlowTrend = useMemo(
    () => filterRowsSinceYearStart(dashboardData.gateData, selectedCumulYear),
    [dashboardData.gateData, selectedCumulYear],
  );
  const gateTttTrend = useMemo(
    () => filterRowsSinceYearStart(dashboardData.gateData, selectedCumulYear),
    [dashboardData.gateData, selectedCumulYear],
  );
  const situationReferenceDate =
    normalizeDateValue(resolveRowDate(situationDaily)) ||
    normalizeDateValue(resolveRowDate(situationReport)) ||
    effectiveSituationDate ||
    latestDashboardDate;
  const situationRecoveryDate =
    normalizeDateValue(situationReport.ops_date_dernier_camion_iso) ||
    normalizeDateValue(resolveRowDate(situationReport)) ||
    situationReferenceDate;
  const situationCollectedAt =
    situationReport.created_at ||
    situationReport.created_timestamp ||
    situationReport.inserted_at ||
    situationReport.updated_at;
  const pleinsParcTotal = toNumber(situationExploitants.exp_grand_total);
  const reeferAvailabilityPct = toNumber(situationParc.reefers_total) > 0
    ? (toNumber(situationParc.reefers_disponibles) / toNumber(situationParc.reefers_total)) * 100
    : 0;
  const parcAvailabilityPct = toNumber(situationParc.parc_conteneurs_total) > 0
    ? (toNumber(situationParc.parc_conteneurs_disponible) / toNumber(situationParc.parc_conteneurs_total)) * 100
    : 0;
  const exportReceptionRate = toNumber(situationDaily.exports_total_prevision) > 0
    ? (toNumber(situationDaily.exports_total_reception) / toNumber(situationDaily.exports_total_prevision)) * 100
    : 0;
  const transboBalance = toNumber(situationDaily.transbo_total_charge) - toNumber(situationDaily.transbo_total_decharge);
  const naviresOperationUnits = situationOperation.reduce((sum, row) => sum + toNumber(row.t_units), 0);
  const naviresOperationRemaining = situationOperation.reduce((sum, row) => sum + toNumber(row.rem_units), 0);
  const naviresOperationCompletion = naviresOperationUnits > 0
    ? ((naviresOperationUnits - naviresOperationRemaining) / naviresOperationUnits) * 100
    : 0;
  const naviresAttendusUnits = situationAttendus.reduce((sum, row) => sum + toNumber(row.t_units_prevu), 0);
  const naviresAppareillesUnits = situationAppareilles.reduce((sum, row) => sum + toNumber(row.t_units), 0);
  const gateContainersPerTruck = toNumber(situationGate.ttt_total_camions) > 0
    ? toNumber(situationGate.ttt_total_conteneurs) / toNumber(situationGate.ttt_total_camions)
    : 0;
  const gateFullShare = toNumber(situationGate.gate_total_mouvements) > 0
    ? ((toNumber(situationGate.gate_entrees_pleins) + toNumber(situationGate.gate_sorties_pleins)) / toNumber(situationGate.gate_total_mouvements)) * 100
    : 0;
  const gateOutboundShare = toNumber(situationGate.gate_total_mouvements) > 0
    ? (toNumber(situationGate.gate_total_sorties) / toNumber(situationGate.gate_total_mouvements)) * 100
    : 0;
  const gateInboundShare = toNumber(situationGate.gate_total_mouvements) > 0
    ? (toNumber(situationGate.gate_total_entrees) / toNumber(situationGate.gate_total_mouvements)) * 100
    : 0;
  const sidebarLatestDate = formatDateLabel(latestDashboardDate || availableDates[0] || situationReferenceDate);
  const parcDelta = toNumber(situationParc.parc_conteneurs_utilise) - toNumber(previousParc.parc_conteneurs_utilise);
  const occupancyDelta = toNumber(situationParc.taux_occupation_parc) - toNumber(previousParc.taux_occupation_parc);
  const reeferDelta = toNumber(situationParc.taux_occupation_reefers) - toNumber(previousParc.taux_occupation_reefers);

  // Sparkline data from daily series
  const dailySpark = useMemo(() => dashboardData.dailyData.slice(-14).map((r) => toNumber(r.total_teu)), [dashboardData.dailyData]);
  const gateSpark = useMemo(() => dashboardData.gateData.slice(-14).map((r) => toNumber(r.ttt_total_camions)), [dashboardData.gateData]);
  const parcSpark = useMemo(() => dashboardData.dailyData.slice(-14).map((r) => toNumber(r.taux_occupation_parc)), [dashboardData.dailyData]);

  const activeShippingOption = filterOptions.shippingLines.find((o) => o.value === shipping) ?? null;
  const avgCompletedProductivity = completedCalls.length > 0
    ? completedCalls.reduce((sum, call) => sum + call.productivity, 0) / completedCalls.length
    : 0;
  const avgCompletedQuayHours = completedCalls.length > 0
    ? completedCalls.reduce((sum, call) => sum + call.quayHours, 0) / completedCalls.length
    : 0;
  const avgCompletedOperationHours = completedCalls.length > 0
    ? completedCalls.reduce((sum, call) => sum + call.operationHours, 0) / completedCalls.length
    : 0;
  const avgProductivityByLoa = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>();
    for (const call of completedCalls) {
      if (call.productivity <= 0) continue;
      const entry = map.get(call.loaBucket) ?? { sum: 0, count: 0 };
      entry.sum += call.productivity;
      entry.count += 1;
      map.set(call.loaBucket, entry);
    }
    return map;
  }, [completedCalls]);



  // Bulletin selector: default to latest month
  const [selectedBulletin, setSelectedBulletin] = useState("");

  // Hydration-safe: set defaults on client, and reset when filtered data changes
  useEffect(() => {
    if (availableDates.length > 0) {
      if (!selectedSituationDate || !availableDates.includes(selectedSituationDate)) {
        setSelectedSituationDate(availableDates[0]);
      }
    } else {
      setSelectedSituationDate("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableDates]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    params.set("tab", activeTab);
    if (activeTab === "segments") {
      params.set("segment", activeSegment);
    } else {
      params.delete("segment");
    }
    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", nextUrl);
  }, [activeSegment, activeTab]);

  useEffect(() => {
    if (monthlyBulletin.length > 0) {
      if (!selectedBulletin || !monthlyBulletin.some((b) => b.anneeMois === selectedBulletin)) {
        setSelectedBulletin(monthlyBulletin[monthlyBulletin.length - 1].anneeMois);
      }
    } else {
      setSelectedBulletin("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthlyBulletin]);

  const activeBulletin = useMemo(
    () => monthlyBulletin.find((b) => b.anneeMois === selectedBulletin) ?? monthlyBulletin[monthlyBulletin.length - 1] ?? null,
    [monthlyBulletin, selectedBulletin],
  );

  const latestOperationRows = useMemo(() => getLatestRows(dashboardData.naviresOperation), [dashboardData.naviresOperation]);
  const latestOperationReport = useMemo(
    () => getLatestReportRow(dashboardData.rapportQuotidien, getLatestDateFromRows(dashboardData.naviresOperation)),
    [dashboardData.naviresOperation, dashboardData.rapportQuotidien],
  );
  const operationsActivePredictions = useMemo(
    () => buildActiveOperationPredictions(latestOperationRows, latestOperationReport, completedCalls),
    [completedCalls, latestOperationReport, latestOperationRows],
  );
  const activeBulletinOperationRows = useMemo(
    () => (activeBulletin ? filterRowsByDate(dashboardData.naviresOperation, activeBulletin.latestDate) : []),
    [activeBulletin, dashboardData.naviresOperation],
  );
  const activeBulletinAttendusRows = useMemo(
    () => (activeBulletin ? filterRowsByDate(dashboardData.naviresAttendus, activeBulletin.latestDate) : []),
    [activeBulletin, dashboardData.naviresAttendus],
  );
  const activeBulletinParcRows = useMemo(
    () => (activeBulletin ? filterRowsByDate(dashboardData.parcConteneurs, activeBulletin.latestDate) : []),
    [activeBulletin, dashboardData.parcConteneurs],
  );
  const activeBulletinReport = useMemo(
    () => (activeBulletin ? getLatestReportRow(dashboardData.rapportQuotidien, activeBulletin.latestDate) : {}),
    [activeBulletin, dashboardData.rapportQuotidien],
  );
  const activeBulletinParc = activeBulletinParcRows[activeBulletinParcRows.length - 1] ?? latestParc;
  const bulletinOperationPredictions = useMemo(
    () => buildActiveOperationPredictions(activeBulletinOperationRows, activeBulletinReport, completedCalls),
    [activeBulletinOperationRows, activeBulletinReport, completedCalls],
  );
  const situationOperationReport = useMemo(
    () => getLatestReportRow(dashboardData.rapportQuotidien, situationReferenceDate),
    [dashboardData.rapportQuotidien, situationReferenceDate],
  );
  const situationOperationPredictions = useMemo(
    () => buildActiveOperationPredictions(situationOperation, situationOperationReport, completedCalls),
    [completedCalls, situationOperation, situationOperationReport],
  );
  const situationOperationPredictionMap = useMemo(() => {
    const map = new Map<string, GenericRow>();
    for (const row of situationOperationPredictions as unknown as GenericRow[]) {
      const key = `${toText(row.nom_navire, "").toUpperCase()}|${toText(row.voyage, "").toUpperCase()}`;
      map.set(key, row);
    }
    return map;
  }, [situationOperationPredictions]);
  const situationOperationRowsEnriched = useMemo(
    () => situationOperation.map((row) => {
      const key = `${toText(row.nom_navire, "").toUpperCase()}|${toText(row.voyage, "").toUpperCase()}`;
      return { ...row, ...(situationOperationPredictionMap.get(key) ?? {}) };
    }),
    [situationOperation, situationOperationPredictionMap],
  );
  const bulletinCapacityAlerts = useMemo(
    () => buildCapacityAlerts(bulletinOperationPredictions as unknown as GenericRow[], activeBulletinAttendusRows, activeBulletinParc),
    [activeBulletinAttendusRows, activeBulletinParc, bulletinOperationPredictions],
  );

  // Analytics engine
  const [analyseSubTab, setAnalyseSubTab] = useState<"daily" | "monthly" | "annual">("daily");

  const dailyAnalysis: DailyAnalysis | null = useMemo(
    () => analyzeDailyPerformance(dashboardData.dailyData, dashboardData.gateData, dashboardData.parcConteneurs, dashboardData.kpisData),
    [dashboardData.dailyData, dashboardData.gateData, dashboardData.parcConteneurs, dashboardData.kpisData],
  );

  const monthlyAnalyses: MonthlyAnalysis[] = useMemo(
    () => analyzeMonthly(dashboardData.dailyData, dashboardData.gateData),
    [dashboardData.dailyData, dashboardData.gateData],
  );

  const annualAnalysis: AnnualAnalysis | null = useMemo(
    () => analyzeAnnual(monthlyAnalyses),
    [monthlyAnalyses],
  );

  const crossAnalyses: CrossAnalysisType[] = useMemo(
    () => buildCrossAnalysis(dashboardData.dailyData, dashboardData.gateData, dashboardData.parcConteneurs, dashboardData.naviresPerformance),
    [dashboardData.dailyData, dashboardData.gateData, dashboardData.parcConteneurs, dashboardData.naviresPerformance],
  );

  const allInsights: Insight[] = useMemo(
    () => generateIntelligence(dailyAnalysis, monthlyAnalyses, annualAnalysis, crossAnalyses),
    [dailyAnalysis, monthlyAnalyses, annualAnalysis, crossAnalyses],
  );
  const strongestCorrelations = useMemo(
    () => [...crossAnalyses].sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation)).slice(0, 6),
    [crossAnalyses],
  );
  const congestionWaitThreshold = useMemo(
    () => {
      const avgQuay = completedCalls.length > 0
        ? completedCalls.reduce((sum, call) => sum + call.quayHours, 0) / completedCalls.length
        : 0;
      return Math.max(4, avgQuay > 0 ? avgQuay * 0.15 : 4);
    },
    [completedCalls],
  );
  const congestedCalls = useMemo(
    () => completedCalls
      .filter((call) => call.waitHours >= congestionWaitThreshold)
      .sort((a, b) => b.waitHours - a.waitHours)
      .slice(0, 8),
    [completedCalls, congestionWaitThreshold],
  );
  const underperformingCalls = useMemo(
    () => completedCalls
      .map((call) => {
        const loaStats = avgProductivityByLoa.get(call.loaBucket);
        const loaAverage = loaStats && loaStats.count > 0 ? loaStats.sum / loaStats.count : 0;
        return {
          ...call,
          loaAverageProductivity: loaAverage,
          performanceGapPct: loaAverage > 0 ? ((call.productivity - loaAverage) / loaAverage) * 100 : 0,
        };
      })
      .filter((call) => call.productivity > 0 && toNumber(call.loaAverageProductivity) > 0 && call.productivity < (toNumber(call.loaAverageProductivity) * 0.85))
      .sort((a, b) => a.productivity - b.productivity)
      .slice(0, 10),
    [avgProductivityByLoa, completedCalls],
  );
  const congestionVsOccupationRows = useMemo(
    () => buildCongestionVsOccupationRows(completedCalls, cumul2026Monthly, congestionWaitThreshold),
    [completedCalls, congestionWaitThreshold, cumul2026Monthly],
  );
  const quayVsProductivityRows = useMemo(
    () => buildMonthlyQuayVsProductivityRows(completedCalls),
    [completedCalls],
  );
  const waitingVsCongestionRows = useMemo(
    () => buildWaitingCountVsCongestionRateRows(completedCalls, congestionWaitThreshold),
    [completedCalls, congestionWaitThreshold],
  );
  const congestionVsOccupationCorrelation = useMemo(
    () => computePearsonCorrelation(congestionVsOccupationRows.map((row) => ({ x: row.x, y: row.y }))),
    [congestionVsOccupationRows],
  );
  const quayVsProductivityCorrelation = useMemo(
    () => computePearsonCorrelation(quayVsProductivityRows.map((row) => ({ x: row.x, y: row.y }))),
    [quayVsProductivityRows],
  );
  const waitingVsCongestionCorrelation = useMemo(
    () => computePearsonCorrelation(waitingVsCongestionRows.map((row) => ({ x: row.x, y: row.y }))),
    [waitingVsCongestionRows],
  );
  const intelligenceGuideSections = useMemo<GuideSection[]>(() => ([
    {
      title: "Module Situation du jour",
      description: "Lecture instantanee du dernier bulletin disponible, sans filtre par defaut, avec toutes les donnees recuperees pour la date du rapport.",
      bullets: [
        "Affiche la date du bulletin, la date de recuperation et la date de chargement.",
        "Consolide les volumes TEU, le gate, le parc, les reefers et les navires.",
        "Les projections navires en operation utilisent le modele historique par ligne et type LOA.",
      ],
    },
    {
      title: "Module Cumul 2026",
      description: "Le cumul annuel somme, pour chaque mois, les valeurs les plus elevees constatees dans le dernier bulletin disponible du mois.",
      bullets: [
        "Import, export, transbo, pleins derives, vides et total sont consolides mois par mois.",
        "Les escales realisees suivent la meme logique de snapshot mensuel.",
        "Les moyennes gate, TTT, occupation et productivite sont calculees sur les jours disponibles de chaque mois.",
      ],
    },
    {
      title: "Module Operations bord",
      description: "Le moteur operations deduplique les escales a la cle voyage et reconstruit les cycles navires a partir des temps portuaires ATA, ATB, ATC et ATD.",
      bullets: [
        "ATA = arrivee reelle en zone portuaire.",
        "ATB = amarrage effectif au quai, debut reel des operations.",
        "ATC = fin reelle des operations.",
        "ATD = depart reel du navire hors port.",
        "Les durees ATA→ATB, ATB→ATC, ATC→ATD et ATA→ATD sont calculees en heures.",
      ],
    },
    {
      title: "Module Intelligence",
      description: "Le module intelligence croise les metriques terrestres, parc et navires pour detecter les tensions, les congestions et les sous-performances.",
      bullets: [
        "Congestion = attente ATA→ATB superieure au seuil calcule sur l'historique.",
        "Sous-performance = productivite navire inferieure a 85% de la moyenne de sa classe LOA.",
        "Les correlations affichent le coefficient de Pearson r, entre -1 et +1.",
        "r proche de +1 = lien positif fort, r proche de -1 = lien negatif fort, r proche de 0 = lien faible.",
      ],
    },
    {
      title: "Exports et PDF",
      description: "Les exports reprennent les blocs visibles du dashboard avec synthese, graphiques, tableaux et notes de lecture metier.",
      bullets: [
        "Le PDF s'adapte a l'onglet actif pour sortir un rapport pertinent.",
        "Les cartes de synthese mettent en avant les KPIs utiles a la lecture immediate.",
        "Les tableaux exportes gardent les colonnes metier les plus importantes.",
      ],
    },
  ]), []);
  const intelligenceCriteria = useMemo(() => ([
    { critere: "Pression parc vs gate", lecture: "Croise occupation parc, disponibilite et debit gate pour detecter saturation ou sous-utilisation." },
    { critere: "TTT vs mouvements", lecture: "Mesure si la hausse du trafic routier degrade le temps de rotation camion." },
    { critere: "Productivite vs volume", lecture: "Observe si les pics de volume se traduisent par une hausse ou une baisse de productivite nette." },
    { critere: "Cycles navires vs LOA", lecture: "Compare attente, operation et cycle total selon le gabarit du navire." },
    { critere: "Cycles navires vs ligne", lecture: "Identifie les lignes maritimes qui consomment le plus de temps a quai ou generent le plus d'attente." },
    { critere: "Capacite terminal vs decharge attendue", lecture: "Alerte quand les units restantes ou a venir depassent les places disponibles sur le terminal." },
    { critere: "Congestion vs occupation parc", lecture: "Mesure si l'allongement de l'attente avant quai suit la pression du parc conteneurs." },
    { critere: "Productivite quai vs duree a quai", lecture: "Observe si une meilleure productivite raccourcit reellement le temps passe a quai." },
    { critere: "Navires en attente vs taux de congestion", lecture: "Suit le lien entre le nombre d'escales en attente avant quai et le poids de la congestion dans le mois." },
  ]), []);

  const activeFilters: { label: string; clear: () => void }[] = [];
  if (year) activeFilters.push({ label: `Annee ${year}`, clear: () => setYear("") });
  if (month) activeFilters.push({ label: filterOptions.months.find((m) => String(m.num) === month)?.name ?? month, clear: () => setMonth("") });
  if (day) activeFilters.push({ label: `Jour ${day}`, clear: () => setDay("") });
  if (activeShippingOption) activeFilters.push({ label: activeShippingOption.label, clear: () => setShipping("") });
  const showGlobalFilters = activeTab !== "bulletin";
  const exportContextLines = useMemo(() => {
    const lines = [
      `Onglet actif: ${
        activeTab === "situation" ? "Situation du jour"
          : activeTab === "cumul2026" ? `Cumul ${selectedCumulYear}`
            : activeTab === "operations" ? "Operations bord"
              : activeTab === "bulletin" ? "Bulletin mensuel"
                : activeTab === "segments" ? `Segment ${SEGMENT_ITEMS.find((s) => s.id === activeSegment)?.label ?? activeSegment}`
                  : activeTab === "navires" ? "Navires & Parc"
                    : activeTab === "analyse" ? "Analyse avancee"
                      : activeTab === "croisee" ? "Analyse croisee"
                        : activeTab === "chat" ? "Chat IA"
                          : "Intelligence analytique"
      }`,
      `Date de reference dashboard: ${formatDateLabel(latestDashboardDate)}`,
    ];
    if (activeTab === "situation") {
      lines.push(`Date bulletin: ${formatDateLabel(situationReferenceDate)}`);
      lines.push(`Date recuperation: ${formatDateLabel(situationRecoveryDate)}`);
      lines.push(`Charge le: ${formatDateTimeLabel(situationCollectedAt)}`);
    }
    if (activeTab === "bulletin" && activeBulletin) {
      lines.push(`Mois bulletin: ${activeBulletin.moisLabel} ${activeBulletin.annee}`);
      lines.push(`Date du bulletin affiche: ${formatDateLabel(activeBulletin.latestDate)}`);
      lines.push(`Realise / Budget: ${formatInteger(activeBulletin.realized)} / ${formatInteger(activeBulletin.budget)}`);
    }
    lines.push(`Filtres actifs: ${activeFilters.length > 0 ? activeFilters.map((f) => f.label).join(", ") : "Aucun filtre global"}`);
    lines.push("Source: BDD KCT / bulletins quotidiens, gate, parc, escales, navires et KPIs.");
    return lines;
  }, [activeBulletin, activeFilters, activeSegment, activeTab, latestDashboardDate, selectedCumulYear, situationCollectedAt, situationRecoveryDate, situationReferenceDate]);

  const toggleSection = (id: string) => setCollapsedSections((c) => ({ ...c, [id]: !c[id] }));
  const openIntelligenceGuide = () => {
    setActiveTab("intelligence");
    setCollapsedSections((current) => ({ ...current, "intelligence-guide": false }));
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        document.getElementById("intelligence-guide")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  };

  const exportRows = useMemo(() => {
    if (activeTab === "situation") {
      return [
        ...situationDailyRows,
        ...situationGateRows,
        ...situationParcRows,
        ...situationKpiRows,
        ...situationAttendus,
        ...situationAppareilles,
        ...situationOperation,
      ];
    }
    if (activeTab === "cumul2026") {
      return [
        ...(cumul2026Monthly as unknown as GenericRow[]),
        ...(cumul2026Shipping as unknown as GenericRow[]),
      ];
    }
    if (activeTab === "operations") return dashboardData.dailyData.slice(-31).reverse();
    if (activeTab === "bulletin") return monthlyBulletin as unknown as GenericRow[];
    if (activeTab === "segments") {
      const segmentMap: Record<string, GenericRow[]> = {
        volumes: dashboardData.dailyData.slice(-31).reverse(),
        gate: dashboardData.gateData.slice(-31).reverse(),
        escales: dashboardData.armateursData.slice(-31).reverse(),
        exploitants: dashboardData.exploitantsData.slice(-31).reverse(),
        kpis: dashboardData.kpisData.slice(-31).reverse(),
        attendus: dashboardData.naviresAttendus,
        appareilles: dashboardData.naviresAppareilles,
        operation: dashboardData.naviresOperation,
        escalesOps: dashboardData.operationsEscales,
        parc: dashboardData.parcConteneurs.slice(-31).reverse(),
        rapport: dashboardData.rapportQuotidien.slice(-31).reverse(),
      };
      return segmentMap[activeSegment] ?? dashboardData.dailyData.slice(-31).reverse();
    }
    return dashboardData.naviresPerformance;
  }, [activeSegment, activeTab, cumul2026Monthly, cumul2026Shipping, dashboardData, monthlyBulletin, situationAppareilles, situationAttendus, situationDailyRows, situationGateRows, situationKpiRows, situationOperation, situationParcRows]);

  /* ── Render ── */
  return (
    <div className="min-h-screen text-[var(--text-primary)]">
      <LoadingOverlay visible={isLoading} />

      <div className="mx-auto flex min-h-screen max-w-[1920px] gap-5 p-4 lg:p-5">
        {/* Sidebar Navigation */}
        <Navigation
          activeTab={activeTab}
          activeSegment={activeSegment}
          onTabChange={setActiveTab}
          onSegmentChange={setActiveSegment}
          isLoading={isLoading}
          latestDate={sidebarLatestDate}
          activeShipping={activeShippingOption}
          logoUrl={pakazureLogo}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
          visibleItems={visibleMenuItems}
        />

        {/* Main Content */}
        <main className="min-w-0 flex-1 space-y-5">
          <div className="hidden" aria-hidden="true">
            {exportContextLines.map((line) => (
              <div key={line} data-export-context-line>{line}</div>
            ))}
          </div>
          {serverError && (
            <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Mode degrade</p>
                  <p className="mt-1 text-amber-50/90">{serverError}</p>
                </div>
              </div>
            </section>
          )}

          {/* ── Header / Filters ── */}
          <header className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 backdrop-blur-sm theme-transition">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSidebarCollapsed((value) => !value)}
                    className="hidden rounded-lg border border-[var(--card-border)] bg-[var(--surface-hover)] p-2 text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] lg:inline-flex"
                    title={sidebarCollapsed ? "Afficher le menu" : "Masquer le menu"}
                  >
                    {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                  </button>
                  <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                    {activeTab === "situation" && "Situation du jour"}
                    {activeTab === "cumul2026" && `Cumul ${selectedCumulYear}`}
                    {activeTab === "operations" && "Operations bord"}
                    {activeTab === "bulletin" && "Bulletin mensuel"}
                    {activeTab === "segments" && `Segment : ${SEGMENT_ITEMS.find((s) => s.id === activeSegment)?.label ?? "Global"}`}
                    {activeTab === "navires" && "Navires & Parc"}
                    {activeTab === "analyse" && "Analyse avancee"}
                    {activeTab === "croisee" && "Analyse croisee"}
                    {activeTab === "intelligence" && "Intelligence analytique"}
                    {activeTab === "chat" && "Chat IA"}
                  </h2>
                  {mounted && activeTab === "situation" && selectedSituationDate && (
                    <select
                      value={effectiveSituationDate}
                      onChange={(e) => setSelectedSituationDate(e.target.value)}
                      className="rounded-lg border border-[var(--card-border)] bg-[var(--input-bg)] px-3 py-1.5 text-[13px] font-medium text-[var(--text-primary)] outline-none transition focus:border-[var(--cyan)]/40"
                    >
                      {availableDates.map((d) => (
                        <option key={d} value={d}>{formatDateLabel(d)}</option>
                      ))}
                    </select>
                  )}
                </div>
                {/* Prominent selected date */}
                <div className="mt-1.5 flex items-center gap-3">
                  <p className="text-2xl font-black tracking-tight text-[var(--cyan)]">
                    {activeTab === "situation" ? formatDateLabel(situationReferenceDate) : formatDateLabel(latestDashboardDate)}
                  </p>
                  <p className="text-[13px] text-[var(--text-muted)]">
                    {activeTab === "situation" && (
                      <>
                        <DataBadge type="jour" /> Bulletin {formatDateLabel(situationReferenceDate)} | Recup. {formatDateLabel(situationRecoveryDate)} | Charge le {formatDateTimeLabel(situationCollectedAt)}
                      </>
                    )}
                    {activeTab === "cumul2026" && <><DataBadge type="cumul-annuel" /> Donnees cumulees {selectedCumulYear}</>}
                    {activeTab === "bulletin" && <><DataBadge type="cumul-mois" /> Cumuls mensuels</>}
                    {activeTab === "analyse" && <><DataBadge type="tendance" /> Analyses multi-niveaux</>}
                    {activeTab === "operations" && <><DataBadge type="tendance" /> Operations bord et productivite navire</>}
                    {(activeTab === "segments" || activeTab === "navires" || activeTab === "croisee" || activeTab === "intelligence" || activeTab === "chat") && <>Cockpit d&apos;exploitation terminal</>}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("chat")}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--cyan)]/20 bg-[var(--badge-bg)] px-3.5 py-2 text-[13px] font-medium text-[var(--cyan)] transition hover:border-[var(--cyan)]/40 hover:text-cyan-300"
                  title="Ouvrir le chat"
                >
                  <Brain className="h-3.5 w-3.5" />
                  Chat
                </button>
                <button
                  type="button"
                  onClick={() => exportCsv(`port-pulse-${activeTab}-${activeSegment}.csv`, exportRows)}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--surface-hover)] px-3.5 py-2 text-[13px] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                >
                  <Download className="h-3.5 w-3.5" />
                  CSV
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const volCols = ["date_rapport", "import_teu", "export_teu", "transbo_teu", "vides_teu", "total_teu", "total_forecast", "taux_realisation_total_pct"];
                    const gateCols = ["date_rapport", "ttt_duree_minutes", "ttt_total_camions", "gate_entrees_pleins", "gate_entrees_vides", "gate_sorties_pleins", "gate_sorties_vides", "gate_total_mouvements"];
                    const escCols = ["date_rapport", "escales_total_prevues", "escales_total_realisees", "taux_realisation_escales_pct", "escales_cma_cgm_realisees", "escales_msc_realisees", "escales_hapag_lloyd_realisees"];
                    const parcCols = ["date_rapport", "parc_conteneurs_utilise", "parc_conteneurs_total", "parc_conteneurs_disponible", "taux_occupation_parc", "reefers_utilises", "reefers_total", "taux_occupation_reefers"];

                    const sheets: ExcelSheet[] = [
                      { name: "Resume", rows: dashboardData.dailyData.slice(-31).reverse(), columns: volCols },
                      { name: "Volumes", rows: dashboardData.dailyData.slice(-31).reverse(), columns: volCols },
                      { name: "Gate", rows: dashboardData.gateData.slice(-31).reverse(), columns: gateCols },
                      { name: "Escales", rows: dashboardData.armateursData.slice(-31).reverse(), columns: escCols },
                      { name: "Parc", rows: dashboardData.parcConteneurs.slice(-31).reverse(), columns: parcCols },
                    ];
                    downloadExcel(`port-pulse-${activeTab}-${formatDateLabel(latestDashboardDate)}.xlsx`, sheets);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--surface-hover)] px-3.5 py-2 text-[13px] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Excel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    // Capture all visible recharts containers on the page
                    const chartImages = await captureCharts(".recharts-responsive-container", 8);

                    const volColumns = [
                      { key: "date_rapport", label: "Date" },
                      { key: "import_teu", label: "Import TEU" },
                      { key: "export_teu", label: "Export TEU" },
                      { key: "transbo_teu", label: "Transbo TEU" },
                      { key: "vides_teu", label: "Vides TEU" },
                      { key: "total_teu", label: "Total TEU" },
                      { key: "total_forecast", label: "Forecast" },
                      { key: "taux_realisation_total_pct", label: "Realisation %" },
                    ];
                    const gateColumns = [
                      { key: "date_rapport", label: "Date" },
                      { key: "ttt_duree_minutes", label: "TTT (min)" },
                      { key: "ttt_total_camions", label: "Camions" },
                      { key: "gate_entrees_pleins", label: "Ent. Pleins" },
                      { key: "gate_entrees_vides", label: "Ent. Vides" },
                      { key: "gate_sorties_pleins", label: "Sort. Pleins" },
                      { key: "gate_sorties_vides", label: "Sort. Vides" },
                      { key: "gate_total_mouvements", label: "Total Mvts" },
                    ];
                    const parcColumns = [
                      { key: "date_rapport", label: "Date" },
                      { key: "parc_conteneurs_utilise", label: "Utilise" },
                      { key: "parc_conteneurs_total", label: "Capacite" },
                      { key: "taux_occupation_parc", label: "Tx Parc %" },
                      { key: "reefers_utilises", label: "Reefers util." },
                      { key: "reefers_total", label: "Reefers total" },
                      { key: "taux_occupation_reefers", label: "Tx Reefer %" },
                    ];
                    const escColumns = [
                      { key: "date_rapport", label: "Date" },
                      { key: "escales_total_prevues", label: "Prevues" },
                      { key: "escales_total_realisees", label: "Realisees" },
                      { key: "taux_realisation_escales_pct", label: "Taux %" },
                    ];

                    const sections: PdfSection[] = activeTab === "operations"
                      ? [
                          {
                            title: "Synthese operations bord",
                            rows: [],
                            intro: "Ce rapport consolide les cycles navires, la productivite nette et les projections de sortie calculees a la cle voyage sur les escales terminees et en operation.",
                            highlights: [
                              { label: "Prod flotte", value: `${avgCompletedProductivity.toFixed(1)} mvts/h` },
                              { label: "Quai moyen", value: formatHours(avgCompletedQuayHours) },
                              { label: "Op moyen", value: formatHours(avgCompletedOperationHours) },
                            ],
                            notes: [
                              "Base navires appareilles dedupliquee a la cle voyage.",
                              "ATA, ATB, ATC et ATD sont utilises pour calculer attente, operation, quai et cycle total.",
                            ],
                          },
                          {
                            title: "Cycles navires par mois",
                            rows: monthlyCycleRows as unknown as GenericRow[],
                            columns: [
                              { key: "moisLabel", label: "Mois" },
                              { key: "escales", label: "Escales" },
                              { key: "waitHours", label: "ATA→ATB" },
                              { key: "operationHours", label: "ATB→ATC" },
                              { key: "postOpsHours", label: "ATC→ATD" },
                              { key: "totalCycleHours", label: "ATA→ATD" },
                            ],
                            chartImage: chartImages[0],
                            intro: "Moyennes horaires mensuelles des cycles navires sur les escales terminees.",
                          },
                          {
                            title: "Projections navires en operation",
                            rows: operationsActivePredictions as unknown as GenericRow[],
                            columns: [
                              { key: "nom_navire", label: "Navire" },
                              { key: "shippingLabel", label: "Ligne" },
                              { key: "loaBucket", label: "LOA" },
                              { key: "rem_units", label: "Restant" },
                              { key: "observedProd", label: "Prod obs." },
                              { key: "modeledProd", label: "Prod modele" },
                              { key: "projectedCompletion", label: "Fin estimee" },
                              { key: "projectedDeparture", label: "Appareillage estime" },
                            ],
                            chartImage: chartImages[1],
                            intro: "Projection calculee a partir de la productivite observee et de l'historique ligne + type de navire.",
                          },
                        ]
                      : activeTab === "cumul2026"
                        ? [
                            {
                              title: `Synthese cumul ${selectedCumulYear}`,
                              rows: [],
                              intro: "Le cumul annuel est calcule en sommant, pour chaque mois, les valeurs les plus elevees constatees dans le dernier bulletin disponible du mois.",
                              highlights: [
                                { label: "EVP cumules", value: formatInteger(cumul2026Annual.totalTeu) },
                                { label: "Escales", value: formatInteger(cumul2026Annual.escalesRealisees) },
                                { label: "Occupation moy.", value: `${cumul2026Annual.occupationAvg.toFixed(0)}%` },
                              ],
                              notes: [
                                "Pleins derives = Import + Export + Transbo quand le champ source n'est pas renseigne.",
                                "Les moyennes mensuelles gate, TTT et occupation sont calculees sur les jours disponibles du mois.",
                              ],
                            },
                            {
                              title: "Cumul EVP par mois",
                              rows: cumul2026Monthly as unknown as GenericRow[],
                              columns: [
                                { key: "moisLabel", label: "Mois" },
                                { key: "importTeu", label: "Import" },
                                { key: "exportTeu", label: "Export" },
                                { key: "transboTeu", label: "Transbo" },
                                { key: "pleinsTeu", label: "Pleins" },
                                { key: "videsTeu", label: "Vides" },
                                { key: "totalTeu", label: "Total" },
                              ],
                              chartImage: chartImages[0],
                            },
                            {
                              title: "Escales par ligne maritime",
                              rows: cumul2026Shipping as unknown as GenericRow[],
                              chartImage: chartImages[1],
                              intro: "Realisations consolidees par ligne sur l'annee selectionnee.",
                            },
                          ]
                        : activeTab === "intelligence"
                          ? [
                              {
                                title: "Synthese intelligence",
                                rows: [],
                                intro: "Le module intelligence croise les flux terrestres, la pression parc, les cycles navires et les productivites pour detecter les points de tension et les corrélations significatives.",
                                highlights: [
                                  { label: "Congestion vs parc", value: `r=${congestionVsOccupationCorrelation.toFixed(2)}` },
                                  { label: "Prod vs quai", value: `r=${quayVsProductivityCorrelation.toFixed(2)}` },
                                  { label: "Attente vs congestion", value: `r=${waitingVsCongestionCorrelation.toFixed(2)}` },
                                ],
                                notes: [
                                  "Les coefficients r sont des corrélations de Pearson calculees sur les series mensuelles consolidees.",
                                  "Une valeur proche de 1 indique un lien positif fort, proche de -1 un lien negatif fort.",
                                ],
                              },
                              {
                                title: "Corrélations prioritaires",
                                rows: strongestCorrelations as unknown as GenericRow[],
                                columns: [
                                  { key: "title", label: "Croisement" },
                                  { key: "xLabel", label: "X" },
                                  { key: "yLabel", label: "Y" },
                                  { key: "correlation", label: "r" },
                                ],
                                chartImage: chartImages[0],
                              },
                              {
                                title: "Navires sous-performes",
                                rows: underperformingCalls as unknown as GenericRow[],
                                chartImage: chartImages[1],
                                intro: "Sous-performance = productivite du navire inferieure a 85% de la moyenne de sa classe LOA.",
                              },
                            ]
                        : activeTab === "chat"
                          ? [
                              {
                                title: "Conversation Port Pulse IA",
                                rows: [],
                                intro: "Le module conversationnel accompagne le pilotage, recalcule les chiffres a partir des donnees et conserve la session en cours dans le navigateur.",
                                notes: [
                                  "Les reponses privilegient les indicateurs metier, les unites explicites et les reformulations utiles.",
                                  "La productivite est exprimee en mvt/h.",
                                  "Le fil conversationnel reste disponible tant que la session du navigateur est conservee.",
                                ],
                              },
                            ]
                          : [
                              {
                                title: "Volumes TEU",
                                rows: dashboardData.dailyData.slice(-15).reverse(),
                                columns: volColumns,
                                chartImage: chartImages[0],
                                intro: "Vue recente des volumes observes et du niveau de realisation par rapport au forecast.",
                              },
                              {
                                title: "Gate / TTT",
                                rows: dashboardData.gateData.slice(-15).reverse(),
                                columns: gateColumns,
                                chartImage: chartImages[1],
                                intro: "Flux terrestres, camions et temps moyen de rotation au gate.",
                              },
                              {
                                title: "Parc conteneurs",
                                rows: dashboardData.parcConteneurs.slice(-15).reverse(),
                                columns: parcColumns,
                                chartImage: chartImages[2],
                                intro: "Occupation du parc et disponibilite reefer sur la periode recente.",
                              },
                              {
                                title: "Escales armateurs",
                                rows: dashboardData.armateursData.slice(-15).reverse(),
                                columns: escColumns,
                                chartImage: chartImages[3],
                                intro: "Suivi des escales prevues, realisees et du taux de service.",
                              },
                            ];

                    await downloadPdf(
                      `port-pulse-rapport-${formatDateLabel(latestDashboardDate)}.pdf`,
                      `Port Pulse - Rapport ${activeTab === "situation" ? "journalier" : activeTab}`,
                      `${formatDateLabel(latestDashboardDate)} | KCT Terminal - Cockpit d'exploitation`,
                      sections,
                      pakazureLogo,
                    );
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--surface-hover)] px-3.5 py-2 text-[13px] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                >
                  <FileText className="h-3.5 w-3.5" />
                  PDF
                </button>
                <button
                  type="button"
                  onClick={openIntelligenceGuide}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--cyan)]/30 bg-[var(--badge-bg)] px-3.5 py-2 text-[13px] font-medium text-[var(--cyan)] transition hover:brightness-110"
                >
                  <Info className="h-3.5 w-3.5" />
                  Guide
                </button>
              </div>
            </div>

            {/* Filters row */}
            {showGlobalFilters ? (
              <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                  <Filter className="h-3.5 w-3.5" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Filtres</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <FilterSelect value={year} onChange={setYear}>
                    <option value="">Annee</option>
                    {filterOptions.years.map((y) => <option key={y} value={y}>{y}</option>)}
                  </FilterSelect>
                  <FilterSelect value={month} onChange={setMonth}>
                    <option value="">Mois</option>
                    {filterOptions.months.map((m) => <option key={m.num} value={m.num}>{m.name}</option>)}
                  </FilterSelect>
                  <FilterSelect value={day} onChange={setDay}>
                    <option value="">Jour</option>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
                  </FilterSelect>
                  <FilterSelect value={shipping} onChange={setShipping}>
                    <option value="">Armateur</option>
                    {filterOptions.shippingLines.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </FilterSelect>
                </div>
                {activeFilters.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {activeFilters.map((f) => <FilterChip key={f.label} label={f.label} onClear={f.clear} />)}
                    <button
                      type="button"
                      onClick={() => { setYear(""); setMonth(""); setDay(""); setShipping(""); }}
                      className="text-[12px] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                    >
                      Tout effacer
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-[var(--card-border)] bg-[var(--surface-hover)] px-4 py-3 text-[12px] text-[var(--text-muted)]">
                Les filtres globaux sont masques ici. Cet onglet est pilote par le selecteur de bulletin.
              </div>
            )}

            {/* Mobile tab navigation */}
            <div className="mt-4 flex flex-wrap gap-1.5 lg:hidden">
              {(["situation", "cumul2026", "operations", "bulletin", "segments", "navires", "analyse", "croisee", "intelligence", "chat"] as MainTabId[]).map((tab) => {
                const labels: Record<string, string> = { situation: "Situation", cumul2026: "Cumul 2026", operations: "Ops bord", bulletin: "Bulletin", segments: "Segments", navires: "Navires", analyse: "Analyse", croisee: "Croisee", intelligence: "Intel.", chat: "Chat" };
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition ${
                      activeTab === tab ? "bg-[var(--badge-bg)] text-[var(--cyan)]" : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    {labels[tab] ?? tab}
                  </button>
                );
              })}
            </div>
          </header>

          {activeTab !== "chat" && (
            <SectionCard
              id="top-kpi-summary"
              title="Synthese executive"
              subtitle={`Vue immediate du bulletin ${formatDateLabel(situationReferenceDate)} et des indicateurs de pression terminal`}
              exportMetadata={[
                `Date bulletin: ${formatDateLabel(situationReferenceDate)}`,
                `Budget total: ${formatInteger(situationDaily.total_forecast)} TEU`,
                `Volume cumule mois: ${formatInteger(situationDaily.total_teu)} TEU`,
                `Gate jour: ${formatInteger(situationGate.ttt_total_camions)} camions / ${formatInteger(situationGate.gate_total_mouvements)} mouvements`,
                `Occupation parc: ${formatPercent(situationParc.taux_occupation_parc)}`,
              ]}
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="Realisation"
                  value={formatPercent(situationDaily.taux_realisation_total_pct)}
                  tone="#10b981"
                  hint={`Bulletin ${formatDateLabel(situationReferenceDate)} | Budget ${formatInteger(situationDaily.total_forecast)} TEU`}
                  icon={<Gauge className="h-4 w-4" />}
                  delta={toNumber(situationDaily.total_teu) - toNumber(situationDaily.total_forecast)}
                  sparkData={dailySpark}
                />
                <MetricCard
                  label="Volume cumul mois"
                  value={formatInteger(situationDaily.total_teu)}
                  tone="#3b82f6"
                  hint={`Cumul mois | Import ${formatInteger(situationDaily.import_teu)} | Export ${formatInteger(situationDaily.export_teu)}`}
                  icon={<Activity className="h-4 w-4" />}
                  sparkData={dailySpark}
                />
                <MetricCard
                  label="Gate jour"
                  value={`${formatInteger(situationGate.ttt_total_camions)} cam.`}
                  tone="#f59e0b"
                  hint={`Jour ${formatDateLabel(situationReferenceDate)} | ${formatInteger(situationGate.gate_total_mouvements)} mvts | TTT ${formatMinutes(situationGate.ttt_duree_minutes)}`}
                  icon={<Truck className="h-4 w-4" />}
                  sparkData={gateSpark}
                />
                <MetricCard
                  label="Occupation parc"
                  value={formatPercent(situationParc.taux_occupation_parc)}
                  tone="#8b5cf6"
                  hint={`Jour ${formatDateLabel(situationReferenceDate)} | ${formatInteger(situationParc.parc_conteneurs_utilise)} / ${formatInteger(situationParc.parc_conteneurs_total)} EVP`}
                  icon={<Container className="h-4 w-4" />}
                  sparkData={parcSpark}
                />
              </div>
            </SectionCard>
          )}

          {/* ═══════════════ TAB: SITUATION ═══════════════ */}
          {activeTab === "situation" && (
            <>
              <SectionCard title="Rapport & synthese" subtitle={<><DataBadge type="jour" /> Date du bulletin, volumes globaux et lecture immediate de la situation</>}>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                  <MetricCard label="Date bulletin" value={formatDateLabel(situationReferenceDate)} tone="#0f766e" hint={`Recup. ${formatDateLabel(situationRecoveryDate)} | Charge le ${formatDateTimeLabel(situationCollectedAt)}`} icon={<CalendarRange className="h-4 w-4" />} compact />
                  <MetricCard label="Volume total" value={formatInteger(situationDaily.total_teu)} tone="#10b981" hint={`Realisation ${formatPercent(situationDaily.taux_realisation_total_pct)} | Util. globale ${formatPercent(situationKpi.kpi_utilisation_globale_pct)}`} icon={<Activity className="h-4 w-4" />} compact />
                  <MetricCard label="Vides TEU" value={formatInteger(situationDaily.vides_teu)} tone="#8b5cf6" hint={`Import ${formatInteger(situationDaily.import_teu)} | Export ${formatInteger(situationDaily.export_teu)}`} icon={<ArrowRightLeft className="h-4 w-4" />} compact />
                  <MetricCard label="Pleins sur parc" value={formatInteger(pleinsParcTotal)} tone="#0ea5e9" hint={`Std+HC ${formatInteger(toNumber(situationExploitants.total_20std) + toNumber(situationExploitants.total_40std) + toNumber(situationExploitants.total_40htc))} | Speciaux ${formatInteger(toNumber(situationExploitants.total_20spe) + toNumber(situationExploitants.total_40spe))}`} icon={<Container className="h-4 w-4" />} compact />
                  <MetricCard label="Exports recu / prevu" value={formatPercent(exportReceptionRate)} tone="#14b8a6" hint={`${formatInteger(situationDaily.exports_total_reception)} / ${formatInteger(situationDaily.exports_total_prevision)} TEU | Recu ${formatInteger(situationDaily.exports_total_teu)} TEU`} icon={<ArrowRightLeft className="h-4 w-4" />} compact />
                  <MetricCard label="Navires actifs" value={formatInteger(situationOperation.length || situationDaily.nb_navires_en_operation)} tone="#06b6d4" hint={`${formatInteger(situationAttendus.length || situationDaily.nb_navires_attendus)} att. | ${formatInteger(situationAppareilles.length || situationDaily.nb_navires_appareilles)} app.`} icon={<Ship className="h-4 w-4" />} compact />
                </div>
              </SectionCard>

              <SectionCard title="Gate & terrestre" subtitle={<><DataBadge type="jour" /> TTT, camions, conteneurs, entrees et sorties pour la journee</>}>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                  <MetricCard label="TTT" value={formatMinutes(situationGate.ttt_duree_minutes)} tone="#f97316" hint={`${formatInteger(situationGate.ttt_total_camions)} camions | ${formatInteger(situationGate.ttt_total_conteneurs)} conteneurs`} icon={<Gauge className="h-4 w-4" />} compact />
                  <MetricCard label="Camions / conteneurs" value={`${formatInteger(situationGate.ttt_total_camions)} / ${formatInteger(situationGate.ttt_total_conteneurs)}`} tone="#0284c7" hint={`${gateContainersPerTruck.toFixed(2)} cont./camion | ${formatInteger(situationGate.gate_total_mouvements)} mvts`} icon={<Truck className="h-4 w-4" />} compact />
                  <MetricCard label="Entrees gate" value={formatPercent(gateInboundShare)} tone="#06b6d4" hint={`${formatInteger(situationGate.gate_total_entrees)} entrees | Pleins ${formatPercent(situationKpi.kpi_gate_ratio_pleins_entrees_pct)}`} icon={<Truck className="h-4 w-4" />} compact />
                  <MetricCard label="Sorties gate" value={formatPercent(gateOutboundShare)} tone="#f59e0b" hint={`${formatInteger(situationGate.gate_total_sorties)} sorties / ${formatInteger(situationGate.gate_total_mouvements)} mvts`} icon={<Truck className="h-4 w-4" />} compact />
                  <MetricCard label="Plein dans les mvts" value={formatPercent(gateFullShare)} tone="#7c3aed" hint={`Entrees pleins ${formatInteger(situationGate.gate_entrees_pleins)} | Sorties pleins ${formatInteger(situationGate.gate_sorties_pleins)}`} icon={<ArrowRightLeft className="h-4 w-4" />} compact />
                  <MetricCard label="Imports detail" value={formatInteger(situationDaily.imports_total_teu)} tone="#2563eb" hint={`${formatInteger(situationDaily.imports_total_tc)} TC | ${formatInteger(situationEscales.length)} escales suivies`} icon={<Ship className="h-4 w-4" />} compact />
                </div>
              </SectionCard>

              <SectionCard title="Parc & reefers" subtitle={<><DataBadge type="jour" /> Occupation, disponibilite et saturation du parc conteneurs</>}>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <MetricCard label="Tx occupation parc" value={formatPercent(situationParc.taux_occupation_parc)} tone="#3b82f6" hint={`Variation ${occupancyDelta >= 0 ? "+" : ""}${occupancyDelta.toFixed(1)} pt`} icon={<Container className="h-4 w-4" />} compact />
                  <MetricCard label="Tx occupation reefer" value={formatPercent(situationParc.taux_occupation_reefers)} tone="#f59e0b" hint={`Variation ${reeferDelta >= 0 ? "+" : ""}${reeferDelta.toFixed(1)} pt`} icon={<Gauge className="h-4 w-4" />} compact />
                  <MetricCard label="Disponibilite parc" value={formatPercent(parcAvailabilityPct)} tone="#84cc16" hint={`${formatInteger(situationParc.parc_conteneurs_disponible)} libres / ${formatInteger(situationParc.parc_conteneurs_total)} EVP`} icon={<Container className="h-4 w-4" />} compact />
                  <MetricCard label="Disponibilite reefer" value={formatPercent(reeferAvailabilityPct)} tone="#f97316" hint={`${formatInteger(situationParc.reefers_disponibles)} dispo / ${formatInteger(situationParc.reefers_total)} plugs`} icon={<Gauge className="h-4 w-4" />} compact />
                  <MetricCard label="Charge transbo nette" value={formatSignedInteger(transboBalance)} tone="#a855f7" hint={`Charge ${formatInteger(situationDaily.transbo_total_charge)} | Decharge ${formatInteger(situationDaily.transbo_total_decharge)}`} icon={<Activity className="h-4 w-4" />} compact />
                </div>
              </SectionCard>

              <SectionCard title="Maritime & navires" subtitle={<><DataBadge type="jour" /> Escales, navires en cours, attendus et volumes maritimes</>}>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <MetricCard label="Navires en operation" value={formatInteger(situationOperation.length || situationDaily.nb_navires_en_operation)} tone="#0ea5e9" hint={`${formatInteger(naviresOperationRemaining)} rem. units | ${formatPercent(naviresOperationCompletion)} complet`} icon={<Ship className="h-4 w-4" />} compact />
                  <MetricCard label="Units maritimes" value={formatInteger(naviresOperationUnits + naviresAttendusUnits + naviresAppareillesUnits)} tone="#16a34a" hint={`Op. ${formatInteger(naviresOperationUnits)} | Att. ${formatInteger(naviresAttendusUnits)} | App. ${formatInteger(naviresAppareillesUnits)}`} icon={<Ship className="h-4 w-4" />} compact />
                  <MetricCard label="Escales realisees" value={formatInteger(situationArmateurs.escales_total_realisees)} tone="#0891b2" hint={`${formatInteger(situationArmateurs.escales_total_prevues)} prevues | ${formatPercent(situationArmateurs.taux_realisation_escales_pct)}`} icon={<Ship className="h-4 w-4" />} compact />
                  <MetricCard label="Transbo total" value={formatInteger(situationDaily.transbo_total_teu)} tone="#d97706" hint={`Charge ${formatInteger(situationDaily.transbo_total_charge)} | Decharge ${formatInteger(situationDaily.transbo_total_decharge)}`} icon={<Activity className="h-4 w-4" />} compact />
                </div>
              </SectionCard>

              <div className="grid gap-5 xl:grid-cols-2">
                <SectionCard title="Occupation parc detaillee" subtitle={<><DataBadge type="tendance" /> Utilise, disponible et variation journaliere depuis le 1er janvier</>}>
                  <div className="mb-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-hover)] p-3">
                      <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">Utilise</p>
                      <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{formatInteger(situationParc.parc_conteneurs_utilise)}</p>
                      <p className="text-[12px] text-[var(--text-secondary)]">Delta veille {formatSignedInteger(parcDelta)}</p>
                    </div>
                    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-hover)] p-3">
                      <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">Disponible</p>
                      <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{formatInteger(situationParc.parc_conteneurs_disponible)}</p>
                      <p className="text-[12px] text-[var(--text-secondary)]">Capacite {formatInteger(situationParc.parc_conteneurs_total)}</p>
                    </div>
                    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-hover)] p-3">
                      <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">Reefers</p>
                      <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{formatInteger(situationParc.reefers_utilises)} / {formatInteger(situationParc.reefers_total)}</p>
                      <p className="text-[12px] text-[var(--text-secondary)]">{formatPercent(situationParc.taux_occupation_reefers)} d&apos;occupation</p>
                    </div>
                  </div>
                  <div className="h-[340px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={occupancyTrend}>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis dataKey="date_rapport" {...CHART_AXIS_PROPS} tickFormatter={formatShortDate} />
                        <YAxis yAxisId="left" {...CHART_AXIS_PROPS} />
                        <YAxis yAxisId="right" orientation="right" {...CHART_AXIS_PROPS} />
                        <Tooltip content={<ChartTooltip labelFormatter={formatDateLabel} valueFormatter={(v, name) => String(name).includes("Tx") ? formatPercent(v) : String(name).includes("Variation") ? formatSignedInteger(v) : formatInteger(v)} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Line yAxisId="left" type="monotone" dataKey="parc_conteneurs_utilise" name="Utilise" stroke="#10b981" strokeWidth={2.5} dot={{ r: 2 }} label={isPngExporting ? { fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Line yAxisId="left" type="monotone" dataKey="parc_conteneurs_disponible" name="Disponible" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 2 }} label={isPngExporting ? { fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Line yAxisId="right" type="monotone" dataKey="variation_utilise" name="Variation journaliere" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} label={isPngExporting ? { fill: "#fca5a5", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Line yAxisId="right" type="monotone" dataKey="taux_occupation_parc" name="Tx parc %" stroke="#8b5cf6" strokeWidth={2.2} dot={{ r: 2 }} label={isPngExporting ? { fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Line yAxisId="right" type="monotone" dataKey="taux_occupation_reefers" name="Tx reefer %" stroke="#f59e0b" strokeWidth={2.2} dot={{ r: 2 }} label={isPngExporting ? { fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>

                <SectionCard title="Pleins, vides et mouvements" subtitle={<><DataBadge type="tendance" /> Evolution des flux gate depuis le 1er janvier | {formatInteger(situationGate.gate_total_mouvements)} mvts | TTT {formatMinutes(situationGate.ttt_duree_minutes)}</>}>
                  <div className="h-[400px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={gateFlowTrend}>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis dataKey="date_rapport" {...CHART_AXIS_PROPS} tickFormatter={formatShortDate} />
                        <YAxis {...CHART_AXIS_PROPS} />
                        <Tooltip content={<ChartTooltip labelFormatter={formatDateLabel} valueFormatter={(v) => formatInteger(v)} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="gate_entrees_pleins" name="Pleins entrants" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                          <LabelList dataKey="gate_entrees_pleins" position="top" formatter={(v: unknown) => toNumber(v) > 0 ? formatInteger(v) : ""} className="fill-slate-300 text-[10px]" />
                        </Bar>
                        <Bar dataKey="gate_entrees_vides" name="Vides entrants" fill="#06b6d4" radius={[6, 6, 0, 0]} label={isPngExporting ? { position: "top", fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Bar dataKey="gate_sorties_pleins" name="Pleins sortants" fill="#f59e0b" radius={[6, 6, 0, 0]} label={isPngExporting ? { position: "top", fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Bar dataKey="gate_sorties_vides" name="Vides sortants" fill="#8b5cf6" radius={[6, 6, 0, 0]} label={isPngExporting ? { position: "top", fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>
              </div>

              <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                <SectionCard title="Pleins, vides et budget" subtitle={<><DataBadge type="jour" /> Flux observes, capacite parc et reference budgetaire</>}>
                  <div className="h-[360px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { poste: "Import", observe: toNumber(situationDaily.import_teu), budget: toNumber(situationDaily.import_forecast) },
                          { poste: "Export", observe: toNumber(situationDaily.export_teu), budget: toNumber(situationDaily.export_forecast) },
                          { poste: "Transbo", observe: toNumber(situationDaily.transbo_teu), budget: toNumber(situationDaily.transbo_forecast) },
                          { poste: "Vides", observe: toNumber(situationDaily.vides_teu), budget: toNumber(situationDaily.vides_forecast) },
                          { poste: "Pleins parc", observe: pleinsParcTotal, budget: toNumber(situationDaily.pleins_forecast) },
                        ]}
                      >
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis dataKey="poste" {...CHART_AXIS_PROPS} />
                        <YAxis {...CHART_AXIS_PROPS} />
                        <Tooltip content={<ChartTooltip valueFormatter={(v) => `${formatInteger(v)} TEU`} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="observe" name="Observe" fill="#10b981" radius={[4, 4, 0, 0]} label={isPngExporting ? { position: "top", fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Bar dataKey="budget" name="Budget" fill="#3b82f6" radius={[4, 4, 0, 0]} label={isPngExporting ? { position: "top", fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>

                <SectionCard title="Escales armateurs du jour" subtitle={<><DataBadge type="jour" /> Realisees, prevues et niveau de service</>}>
                  <div className="space-y-3">
                    {buildArmateurProgress(situationArmateurs).map((item) => (
                      <ProgressBar key={item.name} label={item.name} done={item.done} planned={item.planned} color={item.color} />
                    ))}
                  </div>
                </SectionCard>
              </div>

              <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                <SectionCard title="Par ligne maritime" subtitle={<><DataBadge type="jour" /> Voyages, unites et productivite a la date du bulletin</>}>
                  <div className="h-[360px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={shippingPerformance.slice(0, 8)} layout="vertical">
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis type="number" {...CHART_AXIS_PROPS} />
                        <YAxis type="category" dataKey="shipping" {...CHART_AXIS_PROPS} width={110} />
                        <Tooltip content={<ChartTooltip valueFormatter={(v, name) => String(name).includes("Prod") ? `${toNumber(v).toFixed(1)} mvts/h` : formatInteger(v)} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="units" name="Units" fill="#10b981" radius={[0, 6, 6, 0]}>
                          <LabelList dataKey="units" position="right" formatter={(v: unknown) => formatInteger(v)} className="fill-slate-300 text-[10px]" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>

                <SectionCard title="Occupation du parc" subtitle={<><DataBadge type="jour" /> Stock occupe et reefers a la date du bulletin</>}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="h-[300px] min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={occupationPie}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={62}
                            outerRadius={104}
                            paddingAngle={2}
                            cornerRadius={4}
                            label={isPngExporting ? renderExportPieValueLabel : ({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                          >
                            {occupationPie.map((item) => <Cell key={item.name} fill={item.color} />)}
                          </Pie>
                          <Tooltip content={<ChartTooltip valueFormatter={(v) => formatInteger(v)} />} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="h-[300px] min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={reeferPie}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={62}
                            outerRadius={104}
                            paddingAngle={2}
                            cornerRadius={4}
                            label={isPngExporting ? renderExportPieValueLabel : ({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                          >
                            {reeferPie.map((item) => <Cell key={item.name} fill={item.color} />)}
                          </Pie>
                          <Tooltip content={<ChartTooltip valueFormatter={(v) => formatInteger(v)} />} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-hover)] p-3">
                      <p className="text-[var(--text-muted)]">Parc</p>
                      <p className="mt-1 font-mono text-[var(--text-primary)]">{formatInteger(situationParc.parc_conteneurs_utilise)} occupes / {formatInteger(situationParc.parc_conteneurs_total)} total</p>
                    </div>
                    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-hover)] p-3">
                      <p className="text-[var(--text-muted)]">Reefers</p>
                      <p className="mt-1 font-mono text-[var(--text-primary)]">{formatInteger(situationParc.reefers_utilises)} utilises / {formatInteger(situationParc.reefers_total)} total</p>
                    </div>
                  </div>
                </SectionCard>
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                <SectionCard title="Croisement par ligne" subtitle={<><DataBadge type="jour" /> Parc, reefers, navires et flux rapproches par ligne</>}>
                  <DataTable
                    columns={[
                      { key: "shipping", label: "Ligne" },
                      { key: "parcTotal", label: "Pleins parc", align: "right", render: (r) => formatInteger(r.parcTotal) },
                      { key: "reefers", label: "Reefers", align: "right", render: (r) => formatInteger(r.reefers) },
                      { key: "naviresOperation", label: "En op.", align: "right", render: (r) => formatInteger(r.naviresOperation) },
                      { key: "naviresAttendus", label: "Att.", align: "right", render: (r) => formatInteger(r.naviresAttendus) },
                      { key: "naviresAppareilles", label: "App.", align: "right", render: (r) => formatInteger(r.naviresAppareilles) },
                      { key: "unitsDone", label: "Units", align: "right", render: (r) => formatInteger(r.unitsDone) },
                      { key: "productivity", label: "Prod.", align: "right", render: (r) => `${toNumber(r.productivity).toFixed(1)}` },
                    ]}
                    rows={yardLineRows as unknown as GenericRow[]}
                    compact
                  />
                </SectionCard>

                <SectionCard title="Escales croisees" subtitle={<><DataBadge type="jour" /> Import, export et transbordement au niveau navire</>}>
                  <DataTable
                    columns={[
                      { key: "nom_navire", label: "Navire" },
                      { key: "eta_escale", label: "ETA" },
                      { key: "import_total_teu", label: "Import", align: "right", render: (r) => formatInteger(r.import_total_teu) },
                      { key: "export_total_teu", label: "Export", align: "right", render: (r) => formatInteger(r.export_total_teu) },
                      { key: "transbo_total_teu", label: "Transbo", align: "right", render: (r) => formatInteger(r.transbo_total_teu) },
                      { key: "totalFluxTeu", label: "Total", align: "right", render: (r) => formatInteger(r.totalFluxTeu) },
                    ]}
                    rows={situationEscales as unknown as GenericRow[]}
                    compact
                  />
                </SectionCard>
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                <SectionCard title="Navires attendus du jour" subtitle={<><DataBadge type="jour" /> Bulletin du {formatDateLabel(situationReferenceDate)}</>}>
                  <DataTable
                    columns={[
                      { key: "nom_navire", label: "Navire" },
                      { key: "shipping", label: "Ligne", render: (r) => <ShippingBadge rawValue={r.shipping} /> },
                      { key: "service", label: "Service" },
                      { key: "eta", label: "ETA" },
                      { key: "t_units_prevu", label: "Units", align: "right", render: (r) => formatInteger(r.t_units_prevu) },
                    ]}
                    rows={situationAttendus}
                    compact
                  />
                </SectionCard>

                <SectionCard title="Navires appareilles du jour" subtitle={<><DataBadge type="jour" /> Bulletin du {formatDateLabel(situationReferenceDate)}</>}>
                  <DataTable
                    columns={[
                      { key: "nom_navire", label: "Navire" },
                      { key: "shipping", label: "Ligne", render: (r) => <ShippingBadge rawValue={r.shipping} /> },
                      { key: "service", label: "Service" },
                      { key: "atd", label: "ATD" },
                      { key: "net_prod", label: "Prod.", align: "right", render: (r) => `${toNumber(r.net_prod).toFixed(1)} mvts/h` },
                    ]}
                    rows={situationAppareilles}
                    compact
                  />
                </SectionCard>
              </div>

              <SectionCard title="Navires en operation" subtitle={<><DataBadge type="jour" /> Avancement, units restantes et productivite a la date du bulletin</>}>
                <DataTable
                  columns={[
                    { key: "nom_navire", label: "Navire" },
                    { key: "shipping", label: "Ligne", render: (r) => <ShippingBadge rawValue={r.shipping} /> },
                    { key: "service", label: "Service" },
                    { key: "t_units", label: "Units", align: "right", render: (r) => formatInteger(r.t_units) },
                    { key: "rem_units", label: "Restant", align: "right", render: (r) => formatInteger(r.rem_units) },
                    { key: "pct_complete", label: "Avanc.", align: "right", render: (r) => formatPercent(r.pct_complete) },
                    {
                      key: "net_prod",
                      label: "Prod.",
                      render: (r) => {
                        const appreciation = getProductivityAppreciation(r);
                        return (
                          <div className="flex items-center justify-end gap-2">
                            <span className="font-mono">{`${toNumber(r.net_prod).toFixed(1)} mvts/h`}</span>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${appreciation.className}`}>
                              <span>{appreciation.arrow}</span>
                              <span>{appreciation.label}</span>
                            </span>
                          </div>
                        );
                      },
                    },
                    { key: "etc", label: "ETC" },
                    {
                      key: "projectedCompletion",
                      label: "Fin estimee",
                      render: (r) => (
                        <div className="flex items-center gap-2">
                          <span>{formatDateTimeCompact(r.projectedCompletion as Date | null)}</span>
                        </div>
                      ),
                    },
                    {
                      key: "projectedDeparture",
                      label: "Appareillage estime",
                      render: (r) => formatDateTimeCompact(r.projectedDeparture as Date | null),
                    },
                    {
                      key: "jitStatus",
                      label: "Statut",
                      render: (r) => <JitStatusBadge active={isJustInTime(r)} />,
                    },
                  ]}
                  rows={situationOperationRowsEnriched as unknown as GenericRow[]}
                  compact
                />
              </SectionCard>
            </>
          )}

          {activeTab === "cumul2026" && (
            <>
              {/* KPI cards */}
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard label={`Cumul EVP ${selectedCumulYear}`} value={formatInteger(cumul2026Annual.totalTeu)} tone="#10b981" hint={`Budget ${formatInteger(cumul2026Annual.totalForecast)} | Real. ${formatPercent(cumul2026Annual.tauxRealisationLast)}`} icon={<Activity className="h-4 w-4" />} compact />
                <MetricCard label="Escales realisees" value={formatInteger(cumul2026Annual.escalesRealisees)} tone="#0891b2" hint={`${cumul2026Monthly.length} fins de mois consolidees`} icon={<Ship className="h-4 w-4" />} compact />
                <MetricCard label="Import cumule" value={formatInteger(cumul2026Annual.importTeu)} tone="#3b82f6" hint={cumul2026Annual.totalTeu > 0 ? `${formatPercent((cumul2026Annual.importTeu / cumul2026Annual.totalTeu) * 100)} du cumul` : "—"} icon={<ArrowRightLeft className="h-4 w-4" />} compact />
                <MetricCard label="Export cumule" value={formatInteger(cumul2026Annual.exportTeu)} tone="#06b6d4" hint={cumul2026Annual.totalTeu > 0 ? `${formatPercent((cumul2026Annual.exportTeu / cumul2026Annual.totalTeu) * 100)} du cumul` : "—"} icon={<ArrowRightLeft className="h-4 w-4" />} compact />
                <MetricCard label="Transbo cumule" value={formatInteger(cumul2026Annual.transboTeu)} tone="#f59e0b" hint={cumul2026Annual.totalTeu > 0 ? `${formatPercent((cumul2026Annual.transboTeu / cumul2026Annual.totalTeu) * 100)} du cumul` : "—"} icon={<Container className="h-4 w-4" />} compact />
                <MetricCard label="Pleins I+E+T" value={formatInteger(cumul2026Annual.pleinsTeu)} tone="#7c3aed" hint={`Vides ${formatInteger(cumul2026Annual.videsTeu)}`} icon={<Container className="h-4 w-4" />} compact />
                <MetricCard label="Camions moyens / jour" value={cumul2026Annual.camionsAvgJour.toFixed(0)} tone="#0f766e" hint={`Entrees ${cumul2026Annual.entreesTotalAvgJour.toFixed(0)} | Sorties ${cumul2026Annual.sortiesTotalAvgJour.toFixed(0)}`} icon={<Truck className="h-4 w-4" />} compact />
                <MetricCard label="TTT / Occupation moy." value={formatMinutes(cumul2026Annual.tttAvg)} tone="#8b5cf6" hint={`Parc ${cumul2026Annual.occupationAvg.toFixed(0)}% | Prod. ${cumul2026Annual.productivityAverage.toFixed(1)}`} icon={<Gauge className="h-4 w-4" />} compact />
              </div>

              {/* Cumul TEU par mois (barres) + Moyennes sorties/jour par mois */}
              <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
                <SectionCard title="Cumul EVP par mois" subtitle={<><DataBadge type="cumul-mois" /> Snapshot au dernier bulletin disponible de chaque mois</>}>
                  <div className="h-[380px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={cumul2026Monthly}>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis dataKey="moisLabel" {...CHART_AXIS_PROPS} />
                        <YAxis {...CHART_AXIS_PROPS} />
                        <Tooltip content={<ChartTooltip valueFormatter={(v) => formatInteger(v)} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="importTeu" name="Import" fill="#3b82f6" radius={[4, 4, 0, 0]} stackId="teu" label={isPngExporting ? { position: "top", fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Bar dataKey="exportTeu" name="Export" fill="#10b981" radius={[0, 0, 0, 0]} stackId="teu" label={isPngExporting ? { position: "top", fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Bar dataKey="transboTeu" name="Transbo" fill="#f59e0b" radius={[0, 0, 0, 0]} stackId="teu" label={isPngExporting ? { position: "top", fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Bar dataKey="pleinsTeu" name="Pleins" fill="#7c3aed" radius={[0, 0, 0, 0]} stackId="teu" label={isPngExporting ? { position: "top", fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Bar dataKey="videsTeu" name="Vides" fill="#8b5cf6" radius={[4, 4, 0, 0]} stackId="teu" label={isPngExporting ? { position: "top", fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>

                <SectionCard title="Indicateurs moyens de la periode" subtitle={<><DataBadge type="moy-annuel" /> Moyennes calculees sur l&apos;annee {selectedCumulYear}</>}>
                  <DataTable
                    columns={[
                      { key: "name", label: "Indicateur" },
                      { key: "value", label: "Valeur moyenne", align: "right" },
                    ]}
                    rows={[
                      { name: "Sorties pleins / jour", value: cumul2026Annual.sortiesPleinAvgJour.toFixed(0) },
                      { name: "Sorties vides / jour", value: cumul2026Annual.sortiesVideAvgJour.toFixed(0) },
                      { name: "Entrees totales / jour", value: cumul2026Annual.entreesTotalAvgJour.toFixed(0) },
                      { name: "Total sorties / jour", value: cumul2026Annual.sortiesTotalAvgJour.toFixed(0) },
                      { name: "Camions / jour", value: cumul2026Annual.camionsAvgJour.toFixed(0) },
                      { name: "TTT", value: formatMinutes(cumul2026Annual.tttAvg) },
                      { name: "Occupation parc", value: `${cumul2026Annual.occupationAvg.toFixed(0)}%` },
                      { name: "Occupation reefers", value: `${cumul2026Annual.reefersAvg.toFixed(0)}%` },
                      { name: "Productivite", value: `${cumul2026Annual.productivityAverage.toFixed(1)} mvt/h` },
                    ]}
                    compact
                  />
                </SectionCard>
              </div>

              <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                <SectionCard
                  id="ops-cycle-monthly"
                  title="Cycle navire moyen par mois"
                  subtitle="Moyennes par voyage deduplique : attente, operation, post-operation et cycle total"
                  collapsed={collapsedSections["ops-cycle-monthly"]}
                  onToggle={toggleSection}
                >
                  <div className="h-[360px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyCycleRows}>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis dataKey="moisLabel" {...CHART_AXIS_PROPS} />
                        <YAxis {...CHART_AXIS_PROPS} />
                        <Tooltip content={<ChartTooltip valueFormatter={(v) => formatHours(v)} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Line type="monotone" dataKey="waitHours" name="ATA→ATB (arrivee→quai)" stroke="#06b6d4" strokeWidth={2.2} dot={{ r: 3 }} label={isPngExporting ? { fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Line type="monotone" dataKey="operationHours" name="ATB→ATC (operations)" stroke="#10b981" strokeWidth={2.2} dot={{ r: 3 }} label={isPngExporting ? { fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Line type="monotone" dataKey="postOpsHours" name="ATC→ATD (fin ops→depart)" stroke="#f59e0b" strokeWidth={2.2} dot={{ r: 3 }} label={isPngExporting ? { fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Line type="monotone" dataKey="totalCycleHours" name="ATA→ATD (cycle total)" stroke="#8b5cf6" strokeWidth={2.8} dot={{ r: 4 }} label={isPngExporting ? { fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>

                <SectionCard
                  id="ops-cycle-monthly-table"
                  title="Tableau des durees mensuelles"
                  subtitle="Moyennes horaires par mois, calculees a la cle voyage"
                  collapsed={collapsedSections["ops-cycle-monthly-table"]}
                  onToggle={toggleSection}
                >
                  <DataTable
                    columns={[
                      { key: "moisLabel", label: "Mois" },
                      { key: "escales", label: "Escales", align: "right", render: (r) => formatInteger(r.escales) },
                      { key: "waitHours", label: "ATA→ATB (arrivee→quai)", align: "right", render: (r) => formatHours(r.waitHours) },
                      { key: "operationHours", label: "ATB→ATC (operations)", align: "right", render: (r) => formatHours(r.operationHours) },
                      { key: "postOpsHours", label: "ATC→ATD (fin ops→depart)", align: "right", render: (r) => formatHours(r.postOpsHours) },
                      { key: "totalCycleHours", label: "ATA→ATD (cycle total)", align: "right", render: (r) => formatHours(r.totalCycleHours) },
                    ]}
                    rows={monthlyCycleRows as unknown as GenericRow[]}
                    compact
                    maxHeight="360px"
                  />
                </SectionCard>
              </div>

              {/* Moyennes gate/jour par mois + TTT moyen/jour par mois */}
              <div className="grid gap-5 xl:grid-cols-2">
                <SectionCard title="Moyennes gate / jour par mois" subtitle={<><DataBadge type="moy-mois" /> Entrees, sorties et camions moyens sur les bulletins du mois</>}>
                  <div className="h-[340px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={cumul2026Monthly}>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis dataKey="moisLabel" {...CHART_AXIS_PROPS} />
                        <YAxis {...CHART_AXIS_PROPS} />
                        <Tooltip content={<ChartTooltip valueFormatter={(v) => toNumber(v).toFixed(0)} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="entreesTotalAvgJour" name="Entrees/j" fill="#10b981" radius={[4, 4, 0, 0]} label={isPngExporting ? { position: "top", fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Bar dataKey="sortiesPleinAvgJour" name="Sorties pleins/j" fill="#3b82f6" radius={[4, 4, 0, 0]} label={isPngExporting ? { position: "top", fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Bar dataKey="sortiesVideAvgJour" name="Sorties vides/j" fill="#8b5cf6" radius={[4, 4, 0, 0]} label={isPngExporting ? { position: "top", fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Bar dataKey="camionsAvgJour" name="Camions total/j" fill="#06b6d4" radius={[4, 4, 0, 0]} label={isPngExporting ? { position: "top", fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>

                <SectionCard title="TTT moyen / jour par mois" subtitle={<><DataBadge type="moy-mois" /> Moyenne journaliere en minutes</>}>
                  <div className="h-[340px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={cumul2026Monthly}>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis dataKey="moisLabel" {...CHART_AXIS_PROPS} />
                        <YAxis {...CHART_AXIS_PROPS} />
                        <Tooltip content={<ChartTooltip valueFormatter={(v, name) => String(name).includes("TTT") ? formatMinutes(v) : `${toNumber(v).toFixed(1)}`} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Line type="monotone" dataKey="tttAvg" name="TTT moy./j" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} label={isPngExporting ? { fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Line type="monotone" dataKey="productivityAverage" name="Prod. moy." stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} label={isPngExporting ? { fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>
              </div>

              {/* Occupation + Reefers moyennes par mois */}
              <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                <SectionCard title="Occupation moyenne par mois" subtitle={<><DataBadge type="moy-mois" /> Moyenne journaliere du taux d&apos;occupation</>}>
                  <div className="h-[340px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cumul2026Monthly}>
                        <defs>
                          <linearGradient id="gradOcc" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gradReef" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis dataKey="moisLabel" {...CHART_AXIS_PROPS} />
                        <YAxis {...CHART_AXIS_PROPS} unit="%" />
                        <Tooltip content={<ChartTooltip valueFormatter={(v) => `${toNumber(v).toFixed(1)}%`} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Area type="monotone" dataKey="occupationAvg" name="Parc %" stroke="#8b5cf6" fill="url(#gradOcc)" strokeWidth={2.5} label={isPngExporting ? { fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Area type="monotone" dataKey="reefersAvg" name="Reefers %" stroke="#06b6d4" fill="url(#gradReef)" strokeWidth={2.5} label={isPngExporting ? { fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>

                <SectionCard title={`TTT moyen par jour de semaine (${selectedCumulYear})`} subtitle={<><DataBadge type="moy-annuel" /> Heatmap gate sur l&apos;annee</>}>
                  <WeekdayHeatmap rows={cumul2026WeekdayHeatmap} />
                </SectionCard>
              </div>

              {/* Cumuls gate annuels */}
              <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
                <SectionCard title="Flux gate cumules" subtitle={<><DataBadge type="cumul-annuel" /> Cumul {selectedCumulYear}</>}>
                  <DataTable
                    columns={[
                      { key: "name", label: "Flux" },
                      { key: "cumul", label: "Cumul annuel", align: "right" },
                      { key: "avgJour", label: "Moy. / jour", align: "right" },
                    ]}
                    rows={[
                      { name: "Entrees pleins", cumul: formatInteger(cumul2026Annual.gateEntreesPleins), avgJour: (cumul2026Annual.gateEntreesPleins / Math.max(cumul2026Annual.totalGateDays, 1)).toFixed(0) },
                      { name: "Entrees vides", cumul: formatInteger(cumul2026Annual.gateEntreesVides), avgJour: (cumul2026Annual.gateEntreesVides / Math.max(cumul2026Annual.totalGateDays, 1)).toFixed(0) },
                      { name: "Sorties pleins", cumul: formatInteger(cumul2026Annual.gateSortiesPleins), avgJour: (cumul2026Annual.gateSortiesPleins / Math.max(cumul2026Annual.totalGateDays, 1)).toFixed(0) },
                      { name: "Sorties vides", cumul: formatInteger(cumul2026Annual.gateSortiesVides), avgJour: (cumul2026Annual.gateSortiesVides / Math.max(cumul2026Annual.totalGateDays, 1)).toFixed(0) },
                      { name: "Total camions", cumul: formatInteger(cumul2026Annual.totalCamions), avgJour: cumul2026Annual.camionsAvgJour.toFixed(0) },
                    ]}
                    compact
                  />
                </SectionCard>

                <SectionCard title="Escales par ligne maritime" subtitle={<><DataBadge type="cumul-annuel" /> Cumul annuel {selectedCumulYear}</>}>
                  <DataTable
                    columns={[
                      { key: "shipping", label: "Ligne", render: (r) => <ShippingBadge rawValue={r.shipping} /> },
                      { key: "escales", label: "Escales", align: "right", render: (r) => formatInteger(r.escales) },
                      { key: "units", label: "Units", align: "right", render: (r) => formatInteger(r.units) },
                      { key: "productivity", label: "Prod. moy.", align: "right", render: (r) => toNumber(r.productivity).toFixed(1) },
                    ]}
                    rows={cumul2026ShippingAnnual}
                    compact
                  />
                </SectionCard>
              </div>

              {/* Full monthly table */}
              <SectionCard title={`Tableau mensuel ${selectedCumulYear}`} subtitle={<><DataBadge type="cumul-mois" /> Cumul TEU au dernier jour du mois + moyennes journalieres</>}>
                <DataTable
                  columns={[
                    { key: "moisLabel", label: "Mois" },
                    { key: "latestDate", label: "Derniere fiche", render: (r) => formatDateLabel(r.latestDate) },
                    { key: "escalesRealisees", label: "Escales", align: "right", render: (r) => formatInteger(r.escalesRealisees) },
                    { key: "totalTeu", label: "Cumul TEU", align: "right", render: (r) => formatInteger(r.totalTeu) },
                    { key: "importTeu", label: "Import", align: "right", render: (r) => formatInteger(r.importTeu) },
                    { key: "exportTeu", label: "Export", align: "right", render: (r) => formatInteger(r.exportTeu) },
                    { key: "transboTeu", label: "Transbo", align: "right", render: (r) => formatInteger(r.transboTeu) },
                    { key: "pleinsTeu", label: "Pleins", align: "right", render: (r) => formatInteger(r.pleinsTeu) },
                    { key: "videsTeu", label: "Vides", align: "right", render: (r) => formatInteger(r.videsTeu) },
                    { key: "tauxRealisation", label: "Real. %", align: "right", render: (r) => formatPercent(r.tauxRealisation) },
                    { key: "occupationAvg", label: "Occ. moy.", align: "right", render: (r) => `${toNumber(r.occupationAvg).toFixed(0)}%` },
                    { key: "tttAvg", label: "TTT moy./j", align: "right", render: (r) => formatMinutes(r.tttAvg) },
                    { key: "camionsAvgJour", label: "Cam./j", align: "right", render: (r) => toNumber(r.camionsAvgJour).toFixed(0) },
                    { key: "entreesTotalAvgJour", label: "Ent./j", align: "right", render: (r) => toNumber(r.entreesTotalAvgJour).toFixed(0) },
                    { key: "sortiesTotalAvgJour", label: "Sort./j", align: "right", render: (r) => toNumber(r.sortiesTotalAvgJour).toFixed(0) },
                    { key: "sortiesPleinAvgJour", label: "Sort.P/j", align: "right", render: (r) => toNumber(r.sortiesPleinAvgJour).toFixed(0) },
                    { key: "productivityAverage", label: "Prod.", align: "right", render: (r) => toNumber(r.productivityAverage).toFixed(1) },
                  ]}
                  rows={cumul2026Monthly as unknown as GenericRow[]}
                />
              </SectionCard>

              {/* Escales mensuelles par ligne */}
              <SectionCard title="Escales mensuelles par ligne maritime" subtitle={<><DataBadge type="cumul-mois" /> Realisees en {selectedCumulYear}</>}>
                <DataTable
                  columns={[
                    { key: "anneeMois", label: "Mois", render: (r) => formatMonthAxisLabel(r.anneeMois) },
                    { key: "shipping", label: "Ligne", render: (r) => <ShippingBadge rawValue={r.shipping} /> },
                    { key: "escales", label: "Escales", align: "right", render: (r) => formatInteger(r.escales) },
                    { key: "units", label: "Units", align: "right", render: (r) => formatInteger(r.units) },
                    { key: "productivity", label: "Prod. moy.", align: "right", render: (r) => toNumber(r.productivity).toFixed(1) },
                  ]}
                  rows={cumul2026Shipping as unknown as GenericRow[]}
                />
              </SectionCard>
            </>
          )}

          {/* ═══════════════ TAB: OPERATIONS ═══════════════ */}
          {activeTab === "operations" && (
            <>
              {/* Operations overview cards */}
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Date rapport" value={formatRowDate(latestDaily)} tone="#0f766e" hint={toText(latestDaily.jour_nom_fr, "")} icon={<CalendarRange className="h-4 w-4" />} compact />
                <MetricCard label="Escales uniques" value={formatInteger(completedCalls.length)} tone="#3b82f6" hint={`${selectedCumulYear} | ${formatInteger(latestDaily.nb_navires_en_operation)} navires encore en op.`} icon={<Ship className="h-4 w-4" />} compact />
                <MetricCard label="Prod. navire moy." value={`${avgCompletedProductivity.toFixed(1)} mvts/h`} tone="#8b5cf6" hint={`Sur ${formatInteger(completedCalls.length)} escales terminees`} icon={<Gauge className="h-4 w-4" />} compact />
                <MetricCard label="Duree a quai moy." value={formatHours(avgCompletedQuayHours)} tone="#f59e0b" hint={`Operation ${formatHours(avgCompletedOperationHours)} | Cycle ${formatHours(monthlyCycleRows.length ? monthlyCycleRows.reduce((s, r) => s + r.totalCycleHours, 0) / monthlyCycleRows.length : 0)}`} icon={<Container className="h-4 w-4" />} compact />
              </div>

              <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
                <SectionCard
                  id="ops-monthly-flows"
                  title="Trafic mensuel par type"
                  subtitle="Maxima mensuels 2026 avec pleins derives = import + export + transbo"
                  collapsed={collapsedSections["ops-monthly-flows"]}
                  onToggle={toggleSection}
                >
                  <div className="h-[360px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyTrafficRows}>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis dataKey="moisLabel" {...CHART_AXIS_PROPS} />
                        <YAxis {...CHART_AXIS_PROPS} />
                        <Tooltip content={<ChartTooltip valueFormatter={(v) => `${formatInteger(v)} TEU`} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Line type="monotone" dataKey="importTeu" name="Import" stroke="#3b82f6" strokeWidth={2.2} dot={{ r: 3 }} label={isPngExporting ? { fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Line type="monotone" dataKey="exportTeu" name="Export" stroke="#06b6d4" strokeWidth={2.2} dot={{ r: 3 }} label={isPngExporting ? { fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Line type="monotone" dataKey="transboTeu" name="Transbo" stroke="#f59e0b" strokeWidth={2.2} dot={{ r: 3 }} label={isPngExporting ? { fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Line type="monotone" dataKey="pleinsDerives" name="Pleins I+E+T" stroke="#7c3aed" strokeWidth={2.2} dot={{ r: 3 }} label={isPngExporting ? { fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Line type="monotone" dataKey="videsTeu" name="Vides" stroke="#8b5cf6" strokeWidth={2.2} dot={{ r: 3 }} label={isPngExporting ? { fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Line type="monotone" dataKey="totalTeu" name="Total" stroke="#10b981" strokeWidth={2.8} dot={{ r: 4 }} label={isPngExporting ? { fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>

                <SectionCard
                  id="ops-market-share"
                  title="Part de marche des escales"
                  subtitle="Escales terminees dedupliquees par ligne maritime"
                  collapsed={collapsedSections["ops-market-share"]}
                  onToggle={toggleSection}
                >
                  <div className="h-[300px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={completedShippingPie}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={64}
                          outerRadius={106}
                          paddingAngle={2}
                          cornerRadius={4}
                          label={isPngExporting ? renderExportPieValueLabel : ({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                        >
                          {completedShippingPie.map((item) => <Cell key={item.name} fill={item.color} />)}
                        </Pie>
                        <Tooltip content={<ChartTooltip valueFormatter={(v) => `${formatInteger(v)} escales`} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 space-y-2">
                    {completedShippingStats.slice(0, 5).map((item) => (
                      <div key={item.shipping} className="flex items-center justify-between gap-3 text-sm">
                        <div className="min-w-0">
                          <div className="font-medium text-[var(--text-primary)]">{item.shipping}</div>
                          <div className="text-[12px] text-[var(--text-muted)]">{formatInteger(item.units)} units</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-[var(--cyan)]">{formatInteger(item.escales)}</div>
                          <div className="text-[12px] text-[var(--text-muted)]">{formatPercent(item.marketShare)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </div>

              <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                <SectionCard
                  id="ops-monthly-cycle-chart"
                  title="Cycle navire moyen par mois"
                  subtitle="Cle voyage dedupliquee : ATA→ATB (arrivee→quai), ATB→ATC (operations), ATC→ATD (fin ops→depart), ATA→ATD (cycle total)"
                  collapsed={collapsedSections["ops-monthly-cycle-chart"]}
                  onToggle={toggleSection}
                >
                  <div className="h-[360px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyCycleRows}>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis dataKey="moisLabel" {...CHART_AXIS_PROPS} />
                        <YAxis {...CHART_AXIS_PROPS} />
                        <Tooltip content={<ChartTooltip valueFormatter={(v) => formatHours(v)} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Line type="monotone" dataKey="waitHours" name="ATA→ATB (arrivee→quai)" stroke="#06b6d4" strokeWidth={2.2} dot={{ r: 3 }} label={isPngExporting ? { fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Line type="monotone" dataKey="operationHours" name="ATB→ATC (operations)" stroke="#10b981" strokeWidth={2.2} dot={{ r: 3 }} label={isPngExporting ? { fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Line type="monotone" dataKey="postOpsHours" name="ATC→ATD (fin ops→depart)" stroke="#f59e0b" strokeWidth={2.2} dot={{ r: 3 }} label={isPngExporting ? { fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Line type="monotone" dataKey="totalCycleHours" name="ATA→ATD (cycle total)" stroke="#8b5cf6" strokeWidth={2.8} dot={{ r: 4 }} label={isPngExporting ? { fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>

                <SectionCard
                  id="ops-monthly-cycle-table"
                  title="Tableau des durees mensuelles"
                  subtitle="Moyennes horaires par mois, calculees a la cle voyage"
                  collapsed={collapsedSections["ops-monthly-cycle-table"]}
                  onToggle={toggleSection}
                >
                  <DataTable
                    columns={[
                      { key: "moisLabel", label: "Mois" },
                      { key: "escales", label: "Escales", align: "right", render: (r) => formatInteger(r.escales) },
                      { key: "waitHours", label: "ATA→ATB (arrivee→quai)", align: "right", render: (r) => formatHours(r.waitHours) },
                      { key: "operationHours", label: "ATB→ATC (operations)", align: "right", render: (r) => formatHours(r.operationHours) },
                      { key: "postOpsHours", label: "ATC→ATD (fin ops→depart)", align: "right", render: (r) => formatHours(r.postOpsHours) },
                      { key: "totalCycleHours", label: "ATA→ATD (cycle total)", align: "right", render: (r) => formatHours(r.totalCycleHours) },
                    ]}
                    rows={monthlyCycleRows as unknown as GenericRow[]}
                    compact
                    maxHeight="360px"
                  />
                </SectionCard>
              </div>

              {/* Main operations charts */}
              <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
                <SectionCard
                  id="ops-daily"
                  title="Production journaliere"
                  subtitle="Cumul TEU realise vs budget sur la periode"
                  collapsed={collapsedSections["ops-daily"]}
                  onToggle={toggleSection}
                >
                  <div className="h-[360px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dashboardData.dailyData}>
                        <defs>
                          <linearGradient id="gradReal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gradBudget" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis dataKey="date_rapport" {...CHART_AXIS_PROPS} tickFormatter={formatShortDate} />
                        <YAxis {...CHART_AXIS_PROPS} />
                        <Tooltip content={<ChartTooltip labelFormatter={formatDateLabel} valueFormatter={(v) => formatInteger(v)} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Area type="monotone" dataKey="total_teu" name="Realise" stroke="#10b981" fill="url(#gradReal)" strokeWidth={2.5} label={isPngExporting ? { fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Area type="monotone" dataKey="total_forecast" name="Budget" stroke="#3b82f6" fill="url(#gradBudget)" strokeWidth={2} strokeDasharray="6 3" label={isPngExporting ? { fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>

                <SectionCard
                  id="ops-flow"
                  title="Repartition des flux"
                  subtitle="Import, export, transbordement, vides"
                  collapsed={collapsedSections["ops-flow"]}
                  onToggle={toggleSection}
                >
                  <div className="h-[360px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={flowMix} dataKey="value" nameKey="name" innerRadius={75} outerRadius={120} paddingAngle={3} cornerRadius={4} label={isPngExporting ? renderExportPieValueLabel : undefined}>
                          {flowMix.map((e, i) => <Cell key={e.name} fill={FLOW_COLORS[i % FLOW_COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<ChartTooltip valueFormatter={(v) => `${formatInteger(v)} TEU`} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Flow breakdown numbers */}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {flowMix.map((f, i) => (
                      <div key={f.name} className="flex items-center gap-2 text-sm">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: FLOW_COLORS[i] }} />
                        <span className="text-[var(--text-secondary)]">{f.name}</span>
                        <span className="ml-auto font-mono text-[var(--text-primary)]">{formatInteger(f.value)}</span>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </div>

              {/* Gate + Services */}
              <div className="grid gap-5 xl:grid-cols-2">
                <SectionCard
                  id="ops-gate"
                  title="Gate & mouvements"
                  subtitle="Entrees/sorties pleins et vides"
                  collapsed={collapsedSections["ops-gate"]}
                  onToggle={toggleSection}
                >
                  <div className="h-[320px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[{
                        name: "Gate",
                        "Pleins entrant": toNumber(latestGate.gate_entrees_pleins),
                        "Vides entrant": toNumber(latestGate.gate_entrees_vides),
                        "Pleins sortant": toNumber(latestGate.gate_sorties_pleins),
                        "Vides sortant": toNumber(latestGate.gate_sorties_vides),
                      }]}>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis dataKey="name" {...CHART_AXIS_PROPS} />
                        <YAxis {...CHART_AXIS_PROPS} />
                        <Tooltip content={<ChartTooltip valueFormatter={(v) => formatInteger(v)} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="Pleins entrant" fill="#3b82f6" radius={[6, 6, 0, 0]} label={isPngExporting ? { position: "top", fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Bar dataKey="Vides entrant" fill="#06b6d4" radius={[6, 6, 0, 0]} label={isPngExporting ? { position: "top", fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Bar dataKey="Pleins sortant" fill="#f59e0b" radius={[6, 6, 0, 0]} label={isPngExporting ? { position: "top", fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Bar dataKey="Vides sortant" fill="#8b5cf6" radius={[6, 6, 0, 0]} label={isPngExporting ? { position: "top", fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>

                <SectionCard
                  id="ops-services"
                  title="Recap par service"
                  subtitle="Voyages, unites et productivite nette"
                  collapsed={collapsedSections["ops-services"]}
                  onToggle={toggleSection}
                >
                  <DataTable
                    columns={[
                      { key: "service", label: "Service" },
                      { key: "voyages", label: "Voyages", align: "right", render: (r) => formatInteger(r.voyages) },
                      { key: "units", label: "Unites", align: "right", render: (r) => formatInteger(r.units) },
                      { key: "productivity", label: "Prod.", align: "right", render: (r) => `${toNumber(r.productivity).toFixed(1)}` },
                    ]}
                    rows={serviceRecap}
                    maxHeight="320px"
                    compact
                  />
                </SectionCard>
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                <SectionCard
                  id="ops-shipping-cycle-chart"
                  title="Cycle moyen par ligne maritime"
                  subtitle="Top lignes par escales terminees, calculees a la cle voyage"
                  collapsed={collapsedSections["ops-shipping-cycle-chart"]}
                  onToggle={toggleSection}
                >
                  <div className="h-[360px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={shippingCycleChartRows} layout="vertical" margin={{ top: 8, right: 8, bottom: 8, left: 24 }}>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis type="number" {...CHART_AXIS_PROPS} />
                        <YAxis type="category" dataKey="shipping" width={100} {...CHART_AXIS_PROPS} />
                        <Tooltip content={<ChartTooltip valueFormatter={(v) => formatHours(v)} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="waitHours" name="ATA→ATB (arrivee→quai)" fill="#06b6d4" radius={[0, 4, 4, 0]} label={isPngExporting ? { position: "right", fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Bar dataKey="operationHours" name="ATB→ATC (operations)" fill="#10b981" radius={[0, 4, 4, 0]} label={isPngExporting ? { position: "right", fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Bar dataKey="totalCycleHours" name="ATA→ATD (cycle total)" fill="#8b5cf6" radius={[0, 4, 4, 0]} label={isPngExporting ? { position: "right", fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>

                <SectionCard
                  id="ops-loa-cycle-chart"
                  title="Cycle moyen par type de navire"
                  subtitle="Typologie navire par gabarit LOA"
                  collapsed={collapsedSections["ops-loa-cycle-chart"]}
                  onToggle={toggleSection}
                >
                  <div className="h-[360px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={loaCycleChartRows}>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis dataKey="loaBucket" {...CHART_AXIS_PROPS} />
                        <YAxis {...CHART_AXIS_PROPS} />
                        <Tooltip content={<ChartTooltip valueFormatter={(v) => formatHours(v)} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="waitHours" name="ATA→ATB (arrivee→quai)" fill="#06b6d4" radius={[4, 4, 0, 0]} label={isPngExporting ? { position: "top", fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Bar dataKey="operationHours" name="ATB→ATC (operations)" fill="#10b981" radius={[4, 4, 0, 0]} label={isPngExporting ? { position: "top", fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                        <Bar dataKey="totalCycleHours" name="ATA→ATD (cycle total)" fill="#8b5cf6" radius={[4, 4, 0, 0]} label={isPngExporting ? { position: "top", fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                <SectionCard
                  id="ops-shipping-prod-monthly"
                  title="Productivite nette par ligne et par mois"
                  subtitle="Base navires appareilles, moyenne mensuelle a la cle voyage"
                  collapsed={collapsedSections["ops-shipping-prod-monthly"]}
                  onToggle={toggleSection}
                >
                  <div className="h-[360px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={shippingProductivityMonthly.rows}>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis dataKey="moisLabel" {...CHART_AXIS_PROPS} />
                        <YAxis {...CHART_AXIS_PROPS} />
                        <Tooltip content={<ChartTooltip valueFormatter={(v) => `${toNumber(v).toFixed(1)} mvts/h`} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        {shippingProductivityMonthly.series.map((series, index) => (
                          <Line
                            key={series}
                            type="monotone"
                            dataKey={series}
                            name={series}
                            stroke={FLOW_COLORS[index % FLOW_COLORS.length]}
                            strokeWidth={2.3}
                            dot={{ r: 3 }}
                            label={isPngExporting ? { fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>

                <SectionCard
                  id="ops-loa-prod-monthly"
                  title="Productivite nette par type de navire et par mois"
                  subtitle="Base navires appareilles, moyenne mensuelle par gabarit LOA"
                  collapsed={collapsedSections["ops-loa-prod-monthly"]}
                  onToggle={toggleSection}
                >
                  <div className="h-[360px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={loaProductivityMonthly.rows}>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis dataKey="moisLabel" {...CHART_AXIS_PROPS} />
                        <YAxis {...CHART_AXIS_PROPS} />
                        <Tooltip content={<ChartTooltip valueFormatter={(v) => `${toNumber(v).toFixed(1)} mvts/h`} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        {loaProductivityMonthly.series.map((series, index) => (
                          <Line
                            key={series}
                            type="monotone"
                            dataKey={series}
                            name={series}
                            stroke={["#06b6d4", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#64748b"][index % 6]}
                            strokeWidth={2.2}
                            dot={{ r: 2.5 }}
                            label={isPngExporting ? { fill: "#cbd5e1", fontSize: 10, formatter: formatChartExportLabel } : false}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>
              </div>

              <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
                <SectionCard
                  id="ops-shipping-stats"
                  title="Performance par ligne maritime"
                  subtitle="Escales uniques, units, productivite et durees moyennes"
                  collapsed={collapsedSections["ops-shipping-stats"]}
                  onToggle={toggleSection}
                >
                  <DataTable
                    columns={[
                      { key: "shipping", label: "Ligne" },
                      { key: "escales", label: "Escales", align: "right", render: (r) => formatInteger(r.escales) },
                      { key: "marketShare", label: "PDM", align: "right", render: (r) => formatPercent(r.marketShare) },
                      { key: "units", label: "Units", align: "right", render: (r) => formatInteger(r.units) },
                      { key: "waitHours", label: "ATA→ATB (arrivee→quai)", align: "right", render: (r) => formatHours(r.waitHours) },
                      { key: "productivity", label: "Prod.", align: "right", render: (r) => `${toNumber(r.productivity).toFixed(1)} mvts/h` },
                      { key: "operationHours", label: "Op.", align: "right", render: (r) => formatHours(r.operationHours) },
                      { key: "quayHours", label: "Quai", align: "right", render: (r) => formatHours(r.quayHours) },
                      { key: "totalCycleHours", label: "Cycle", align: "right", render: (r) => formatHours(r.totalCycleHours) },
                    ]}
                    rows={completedShippingStats as unknown as GenericRow[]}
                    compact
                    maxHeight="360px"
                  />
                </SectionCard>

                <SectionCard
                  id="ops-loa-stats"
                  title="Durees par gabarit LOA"
                  subtitle="Segmentation navires selon la longueur hors tout"
                  collapsed={collapsedSections["ops-loa-stats"]}
                  onToggle={toggleSection}
                >
                  <DataTable
                    columns={[
                      { key: "loaBucket", label: "LOA" },
                      { key: "escales", label: "Escales", align: "right", render: (r) => formatInteger(r.escales) },
                      { key: "units", label: "Units", align: "right", render: (r) => formatInteger(r.units) },
                      { key: "waitHours", label: "ATA→ATB (arrivee→quai)", align: "right", render: (r) => formatHours(r.waitHours) },
                      { key: "productivity", label: "Prod.", align: "right", render: (r) => `${toNumber(r.productivity).toFixed(1)} mvts/h` },
                      { key: "operationHours", label: "Op.", align: "right", render: (r) => formatHours(r.operationHours) },
                      { key: "quayHours", label: "Quai", align: "right", render: (r) => formatHours(r.quayHours) },
                      { key: "totalCycleHours", label: "Cycle", align: "right", render: (r) => formatHours(r.totalCycleHours) },
                    ]}
                    rows={completedLoaStats as unknown as GenericRow[]}
                    compact
                    maxHeight="360px"
                  />
                </SectionCard>
              </div>

              <SectionCard
                id="ops-active-projections"
                title="Navires en operation : projection de sortie"
                subtitle="Modele base sur la productivite observee, ajuste avec l'historique par ligne et LOA"
                collapsed={collapsedSections["ops-active-projections"]}
                onToggle={toggleSection}
              >
                <DataTable
                  columns={[
                    { key: "nom_navire", label: "Navire" },
                    { key: "shippingLabel", label: "Ligne" },
                    { key: "loaBucket", label: "LOA" },
                    { key: "ata_pstn", label: "ATA" },
                    { key: "atb", label: "ATB" },
                    { key: "etc", label: "ETC bulletin" },
                    { key: "rem_units", label: "Rem.", align: "right", render: (r) => formatInteger(r.rem_units) },
                    { key: "observedProd", label: "Prod obs.", align: "right", render: (r) => `${toNumber(r.observedProd).toFixed(1)}` },
                    { key: "modeledProd", label: "Prod modele", align: "right", render: (r) => `${toNumber(r.modeledProd).toFixed(1)}` },
                    { key: "elapsedQuayHours", label: "Deja a quai", align: "right", render: (r) => formatHours(r.elapsedQuayHours) },
                    { key: "projectedCompletion", label: "Fin estimee", render: (r) => formatDateTimeCompact(r.projectedCompletion as Date | null) },
                    { key: "projectedDeparture", label: "Sortie estimee", render: (r) => formatDateTimeCompact(r.projectedDeparture as Date | null) },
                    {
                      key: "jitStatus",
                      label: "JIT",
                      render: (r) => <JitStatusBadge active={isJustInTime(r)} />,
                    },
                  ]}
                  rows={operationsActivePredictions as unknown as GenericRow[]}
                  compact
                  maxHeight="360px"
                />
              </SectionCard>

              {/* Ports */}
              <SectionCard
                id="ops-ports"
                title="Provenance & destination"
                subtitle="Ports les plus representes dans les escales attendues"
                collapsed={collapsedSections["ops-ports"]}
                onToggle={toggleSection}
              >
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <div className="mb-3 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <MapPinned className="h-3.5 w-3.5 text-[var(--cyan)]" />
                      <span className="font-medium">Dernier port</span>
                    </div>
                    <div className="space-y-2">
                      {portOrigins.map((item, i) => (
                        <div key={item.port} className="flex items-center gap-3">
                          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/[0.04] text-[11px] font-bold text-[var(--text-muted)]">{i + 1}</span>
                          <span className="flex-1 text-sm text-[var(--text-primary)]">{item.port}</span>
                          <span className="font-mono text-sm font-medium text-[var(--cyan)]">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-3 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <MapPinned className="h-3.5 w-3.5 text-[var(--emerald)]" />
                      <span className="font-medium">Prochain port</span>
                    </div>
                    <div className="space-y-2">
                      {portDestinations.map((item, i) => (
                        <div key={item.port} className="flex items-center gap-3">
                          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/[0.04] text-[11px] font-bold text-[var(--text-muted)]">{i + 1}</span>
                          <span className="flex-1 text-sm text-[var(--text-primary)]">{item.port}</span>
                          <span className="font-mono text-sm font-medium text-[var(--emerald)]">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                id="ops-glossary"
                title="Glossaire operations bord"
                subtitle="Lecture metier des temps navire utilises dans les calculs"
                collapsed={collapsedSections["ops-glossary"]}
                onToggle={toggleSection}
              >
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {[
                    { code: "ATA", text: "Arrivee reelle en zone portuaire." },
                    { code: "ATB", text: "Amarrage effectif au quai : debut reel des operations." },
                    { code: "ATC", text: "Fin reelle des operations de chargement / dechargement." },
                    { code: "ATD", text: "Depart reel du navire hors port." },
                    { code: "ETC", text: "Fin estimee des operations. C'est une prevision, pas une heure constatee." },
                    { code: "TC", text: "Total conteneurs. Dans le bulletin, il s'agit du volume en nombre de conteneurs, distinct des EVP/TEU." },
                  ].map((item) => (
                    <div key={item.code} className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-hover)] p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cyan)]">{item.code}</div>
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">{item.text}</p>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </>
          )}

          {/* ═══════════════ TAB: BULLETIN ═══════════════ */}
          {activeTab === "bulletin" && (
            <>
              {/* Bulletin selector */}
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Bulletin</span>
                  <select
                    value={selectedBulletin}
                    onChange={(e) => setSelectedBulletin(e.target.value)}
                    className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--input-bg)] px-4 py-2.5 text-[13px] text-[var(--text-primary)] outline-none transition focus:border-[var(--cyan)]/40 focus:ring-1 focus:ring-[var(--cyan)]/20 sm:min-w-[360px] lg:min-w-[520px]"
                  >
                    {monthlyBulletin.slice().reverse().map((b) => (
                      <option key={b.anneeMois} value={b.anneeMois}>
                        {b.moisLabel} {b.annee} | Bulletin affiche : {formatDateLabel(b.latestDate)}
                      </option>
                    ))}
                  </select>
                </div>
                {activeBulletin && (
                  <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3 text-[13px] text-[var(--text-secondary)]">
                    <span className="font-medium text-[var(--text-primary)]">Date du bulletin affiche :</span>{" "}
                    <strong>{formatDateLabel(activeBulletin.latestDate)}</strong>
                  </div>
                )}
              </div>

              {/* Bulletin headline cards */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 theme-transition">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Mois selectionne</p>
                  <p className="mt-2 text-xl font-bold text-[var(--text-primary)]">
                    {activeBulletin ? `${activeBulletin.moisLabel} ${activeBulletin.annee}` : "—"}
                  </p>
                  <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                    Dernier point : {activeBulletin ? formatDateLabel(activeBulletin.latestDate) : "—"}
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 theme-transition">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Realise / Budget</p>
                  <p className="mt-2 text-xl font-bold text-[var(--text-primary)]">
                    {activeBulletin ? formatInteger(activeBulletin.realized) : "0"}
                    <span className="mx-1 text-[var(--text-muted)]">/</span>
                    <span className="text-[var(--text-secondary)]">{activeBulletin ? formatInteger(activeBulletin.budget) : "0"}</span>
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 theme-transition">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Camions cumules / TTT moyen</p>
                  <p className="mt-2 text-xl font-bold text-[var(--text-primary)]">
                    {activeBulletin ? formatInteger(activeBulletin.gateCamionsSum) : "0"}
                    <span className="ml-2 text-base text-[var(--text-secondary)]">
                      TTT {activeBulletin ? formatMinutes(activeBulletin.tttAverage) : "00:00"}
                    </span>
                  </p>
                </div>
              </div>

              {/* Bulletin chart */}
              <SectionCard
                id="bulletin-chart"
                title="Evolution mensuelle"
                subtitle="Realise vs budget par mois"
                collapsed={collapsedSections["bulletin-chart"]}
                onToggle={toggleSection}
              >
                <div className="h-[400px] min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyBulletin}>
                      <CartesianGrid {...CHART_GRID_PROPS} />
                      <XAxis dataKey="anneeMois" {...CHART_AXIS_PROPS} tickFormatter={formatMonthAxisLabel} interval={0} angle={-18} textAnchor="end" height={60} />
                      <YAxis {...CHART_AXIS_PROPS} />
                      <Tooltip content={<ChartTooltip labelFormatter={formatMonthAxisLabel} valueFormatter={(v) => formatInteger(v)} />} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="realized" name="Realise" fill="#10b981" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="budget" name="Budget" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>

              {/* Bulletin sub-sections */}
              <div className="grid gap-5 xl:grid-cols-3">
                <SectionCard
                  id="bulletin-weekday"
                  title="Camions par jour de semaine"
                  subtitle="Moyenne des mouvements gate et du TTT"
                  collapsed={collapsedSections["bulletin-weekday"]}
                  onToggle={toggleSection}
                >
                  <div className="h-[320px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weekdayAverages}>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis dataKey="name" {...CHART_AXIS_PROPS} angle={-18} textAnchor="end" height={60} />
                        <YAxis {...CHART_AXIS_PROPS} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="camions" name="Mvts moy." fill="#3b82f6" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="ttt" name="TTT (min)" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>

                <SectionCard
                  id="bulletin-occupation"
                  title="Occupation & reefers"
                  subtitle="Taux de remplissage parc et reefers"
                  collapsed={collapsedSections["bulletin-occupation"]}
                  onToggle={toggleSection}
                >
                  <div className="h-[320px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={yearScopedDailyData}>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis dataKey="date_rapport" {...CHART_AXIS_PROPS} tickFormatter={formatShortDate} />
                        <YAxis {...CHART_AXIS_PROPS} />
                        <Tooltip content={<ChartTooltip labelFormatter={formatDateLabel} valueFormatter={(v) => `${toNumber(v).toFixed(1)}%`} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Line type="monotone" dataKey="taux_occupation_parc" name="Parc" stroke="#10b981" strokeWidth={2.5} dot={false} />
                        <Line type="monotone" dataKey="taux_occupation_reefers" name="Reefers" stroke="#8b5cf6" strokeWidth={2.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>

                <SectionCard
                  id="bulletin-escales"
                  title="Escales par armateur"
                  subtitle="Prevu vs realise"
                  collapsed={collapsedSections["bulletin-escales"]}
                  onToggle={toggleSection}
                >
                  <div className="space-y-4">
                    {armateurProgress.map((item) => (
                      <ProgressBar key={item.name} label={item.name} done={item.done} planned={item.planned} color={item.color} />
                    ))}
                  </div>
                </SectionCard>
              </div>

              <SectionCard
                id="bulletin-capacity-alerts"
                title="Alertes capacite terminal"
                subtitle="Confrontation entre reste a decharger, navires attendus et places disponibles"
                collapsed={collapsedSections["bulletin-capacity-alerts"]}
                onToggle={toggleSection}
              >
                <div className="grid gap-3 md:grid-cols-3">
                  {bulletinCapacityAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`rounded-xl border p-4 ${
                        alert.level === "critical"
                          ? "border-rose-500/25 bg-rose-500/8"
                          : alert.level === "warning"
                            ? "border-amber-500/25 bg-amber-500/8"
                            : "border-sky-500/25 bg-sky-500/8"
                      }`}
                    >
                      <p className={`text-[13px] font-semibold ${
                        alert.level === "critical"
                          ? "text-rose-400"
                          : alert.level === "warning"
                            ? "text-amber-400"
                            : "text-sky-400"
                      }`}>{alert.title}</p>
                      <p className="mt-1 text-[12px] text-[var(--text-secondary)]">{alert.description}</p>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard
                id="bulletin-ops-projection"
                title="Navires en operation : projection de sortie"
                subtitle="Projection sur le bulletin affiche, avec ajustement sur l'historique des escales terminees"
                collapsed={collapsedSections["bulletin-ops-projection"]}
                onToggle={toggleSection}
              >
                <DataTable
                  columns={[
                    { key: "nom_navire", label: "Navire" },
                    { key: "shippingLabel", label: "Ligne" },
                    { key: "loaBucket", label: "LOA" },
                    { key: "ata_pstn", label: "ATA" },
                    { key: "atb", label: "ATB" },
                    { key: "etc", label: "ETC bulletin" },
                    { key: "rem_units", label: "Rem.", align: "right", render: (r) => formatInteger(r.rem_units) },
                    { key: "observedProd", label: "Prod obs.", align: "right", render: (r) => `${toNumber(r.observedProd).toFixed(1)}` },
                    { key: "modeledProd", label: "Prod modele", align: "right", render: (r) => `${toNumber(r.modeledProd).toFixed(1)}` },
                    {
                      key: "projectedCompletion",
                      label: "Fin estimee",
                      render: (r) => (
                        <div className="flex items-center gap-2">
                          <span>{formatDateTimeCompact(r.projectedCompletion as Date | null)}</span>
                          {isJustInTime(r) && (
                            <JitStatusBadge active />
                          )}
                        </div>
                      ),
                    },
                    { key: "projectedDeparture", label: "Sortie estimee", render: (r) => formatDateTimeCompact(r.projectedDeparture as Date | null) },
                  ]}
                  rows={bulletinOperationPredictions as unknown as GenericRow[]}
                  compact
                />
              </SectionCard>

              {/* Bulletin table */}
              <SectionCard
                id="bulletin-table"
                title="Tableau mensuel"
                subtitle="Cumuls gate et moyennes journalieres recalcules"
                collapsed={collapsedSections["bulletin-table"]}
                onToggle={toggleSection}
              >
                <DataTable
                  columns={[
                    { key: "anneeMois", label: "Mois" },
                    { key: "realized", label: "Realise", align: "right", render: (r) => formatInteger(r.realized) },
                    { key: "budget", label: "Budget", align: "right", render: (r) => formatInteger(r.budget) },
                    { key: "gateCamionsSum", label: "Camions", align: "right", render: (r) => formatInteger(r.gateCamionsSum) },
                    { key: "gateMovementsSum", label: "Mvts", align: "right", render: (r) => formatInteger(r.gateMovementsSum) },
                    { key: "tttAverage", label: "TTT", align: "right", render: (r) => formatMinutes(r.tttAverage) },
                    { key: "occupationAverage", label: "Parc %", align: "right", render: (r) => formatPercent(r.occupationAverage) },
                  ]}
                  rows={monthlyBulletin as unknown as GenericRow[]}
                />
              </SectionCard>

              {/* Bulletin management: duplicate detection & deletion */}
              <SectionCard
                id="bulletin-manage"
                title="Gestion des bulletins"
                subtitle="Doublons detectes et suppression"
                collapsed={collapsedSections["bulletin-manage"]}
                onToggle={toggleSection}
              >
                <BulletinManager onDeleted={() => router.refresh()} />
              </SectionCard>
            </>
          )}

          {/* ═══════════════ TAB: SEGMENTS ═══════════════ */}
          {activeTab === "segments" && (
            <>
              {/* Mobile segment picker */}
              <div className="flex flex-wrap gap-1.5 overflow-x-auto lg:hidden">
                {SEGMENT_ITEMS.map((s) => (
                  <button key={s.id} type="button" onClick={() => setActiveSegment(s.id)}
                    className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[12px] font-medium transition ${activeSegment === s.id ? "bg-[var(--badge-bg)] text-[var(--cyan)]" : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"}`}>
                    {s.label}
                  </button>
                ))}
              </div>

              {activeSegment === "global" && (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <MetricCard label="Rapports" value={formatInteger(dashboardData.rapportQuotidien.length)} tone="#3b82f6" hint="Occurrences disponibles" icon={<CalendarRange className="h-4 w-4" />} compact />
                  <MetricCard label="KPIs" value={formatPercent(latestKpi.kpi_utilisation_globale_pct)} tone="#10b981" hint={`Flag TTT : ${toText(latestKpi.kpi_ttt_flag, "normal")}`} icon={<Gauge className="h-4 w-4" />} compact />
                  <MetricCard label="Parc" value={formatPercent(latestParc.taux_occupation_parc)} tone="#8b5cf6" hint={`${formatInteger(latestParc.parc_conteneurs_utilise)} utilises`} icon={<Container className="h-4 w-4" />} compact />
                  <MetricCard label="Navires en op." value={formatInteger(dashboardData.naviresOperation.length)} tone="#f59e0b" hint="Lignes dans le segment" icon={<Ship className="h-4 w-4" />} compact />
                </div>
              )}

              {activeSegment === "volumes" && (
                <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
                  <SectionCard title="Volumes TEU" subtitle={`Evolution import, export, transbo, vides depuis le 1er janvier ${selectedCumulYear}`}>
                    <div className="h-[380px] min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={yearScopedDailyData}>
                          <CartesianGrid {...CHART_GRID_PROPS} />
                          <XAxis dataKey="date_rapport" {...CHART_AXIS_PROPS} tickFormatter={formatShortDate} />
                          <YAxis {...CHART_AXIS_PROPS} />
                          <Tooltip content={<ChartTooltip labelFormatter={formatDateLabel} valueFormatter={(v) => formatInteger(v)} />} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Line type="monotone" dataKey="import_teu" name="Import" stroke="#3b82f6" strokeWidth={2.2} dot={false} />
                          <Line type="monotone" dataKey="export_teu" name="Export" stroke="#10b981" strokeWidth={2.2} dot={false} />
                          <Line type="monotone" dataKey="transbo_teu" name="Transbo" stroke="#f59e0b" strokeWidth={2.2} dot={false} />
                          <Line type="monotone" dataKey="vides_teu" name="Vides" stroke="#8b5cf6" strokeWidth={2.2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </SectionCard>
                  <DataTable
                    columns={[
                      { key: "date_rapport", label: "Date", render: (r) => formatDateLabel(r.date_rapport) },
                      { key: "import_teu", label: "Import", align: "right", render: (r) => formatInteger(r.import_teu) },
                      { key: "export_teu", label: "Export", align: "right", render: (r) => formatInteger(r.export_teu) },
                      { key: "transbo_teu", label: "Transbo", align: "right", render: (r) => formatInteger(r.transbo_teu) },
                      { key: "total_teu", label: "Total", align: "right", render: (r) => formatInteger(r.total_teu) },
                    ]}
                    rows={[...yearScopedDailyData].reverse()}
                  />
                </div>
              )}

              {activeSegment === "gate" && (
                <div className="space-y-5">
                  <div className="grid gap-5 xl:grid-cols-2">
                    <SectionCard title="Gate / TTT" subtitle={`Camions et mouvements par date depuis le 1er janvier ${selectedCumulYear}`}>
                      <div className="h-[380px] min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={yearScopedGateData}>
                            <CartesianGrid {...CHART_GRID_PROPS} />
                            <XAxis dataKey="date_rapport" {...CHART_AXIS_PROPS} tickFormatter={formatShortDate} />
                            <YAxis {...CHART_AXIS_PROPS} />
                            <Tooltip content={<ChartTooltip labelFormatter={formatDateLabel} valueFormatter={(v) => formatInteger(v)} />} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Bar dataKey="ttt_total_camions" name="Camions" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                            <Bar dataKey="gate_total_mouvements" name="Mouvements" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </SectionCard>

                    <SectionCard title="Evolution du TTT" subtitle={`Fiches gate disponibles depuis le 1er janvier ${selectedCumulYear}`}>
                      <div className="h-[380px] min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={gateTttTrend}>
                            <CartesianGrid {...CHART_GRID_PROPS} />
                            <XAxis dataKey="date_rapport" {...CHART_AXIS_PROPS} tickFormatter={formatShortDate} />
                            <YAxis yAxisId="left" {...CHART_AXIS_PROPS} />
                            <YAxis yAxisId="right" orientation="right" {...CHART_AXIS_PROPS} />
                            <Tooltip
                              content={(
                                <ChartTooltip
                                  labelFormatter={formatDateLabel}
                                  valueFormatter={(v, name) => String(name).includes("TTT") ? formatMinutes(v) : formatInteger(v)}
                                />
                              )}
                            />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Line yAxisId="left" type="monotone" dataKey="ttt_duree_minutes" name="TTT" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 2.5 }} />
                            <Line yAxisId="right" type="monotone" dataKey="ttt_total_camions" name="Camions" stroke="#3b82f6" strokeWidth={2.2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </SectionCard>
                  </div>

                  <DataTable
                    columns={[
                      { key: "date_rapport", label: "Date", render: (r) => formatDateLabel(r.date_rapport) },
                      { key: "ttt_duree_minutes", label: "TTT", align: "right", render: (r) => formatMinutes(r.ttt_duree_minutes) },
                      { key: "ttt_total_camions", label: "Camions", align: "right", render: (r) => formatInteger(r.ttt_total_camions) },
                      { key: "gate_entrees_pleins", label: "Ent. P", align: "right", render: (r) => formatInteger(r.gate_entrees_pleins) },
                      { key: "gate_sorties_pleins", label: "Sort. P", align: "right", render: (r) => formatInteger(r.gate_sorties_pleins) },
                      { key: "gate_total_mouvements", label: "Mvts", align: "right", render: (r) => formatInteger(r.gate_total_mouvements) },
                    ]}
                    rows={[...yearScopedGateData].reverse()}
                  />
                </div>
              )}

              {activeSegment === "escales" && (
                <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
                  <SectionCard title="Escales armateurs" subtitle={`Prevues vs realisees depuis le 1er janvier ${selectedCumulYear}`}>
                    <div className="h-[380px] min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={yearScopedArmateursData}>
                          <CartesianGrid {...CHART_GRID_PROPS} />
                          <XAxis dataKey="date_rapport" {...CHART_AXIS_PROPS} tickFormatter={formatShortDate} />
                          <YAxis {...CHART_AXIS_PROPS} />
                          <Tooltip content={<ChartTooltip labelFormatter={formatDateLabel} />} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Line type="monotone" dataKey="escales_total_prevues" name="Prevues" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
                          <Line type="monotone" dataKey="escales_total_realisees" name="Realisees" stroke="#10b981" strokeWidth={2.5} dot={false} />
                          <Line type="monotone" dataKey="taux_realisation_escales_pct" name="Taux %" stroke="#f59e0b" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </SectionCard>
                  <DataTable
                    columns={[
                      { key: "date_rapport", label: "Date", render: (r) => formatDateLabel(r.date_rapport) },
                      { key: "escales_total_prevues", label: "Prevues", align: "right", render: (r) => formatInteger(r.escales_total_prevues) },
                      { key: "escales_total_realisees", label: "Realisees", align: "right", render: (r) => formatInteger(r.escales_total_realisees) },
                      { key: "taux_realisation_escales_pct", label: "Taux", align: "right", render: (r) => formatPercent(r.taux_realisation_escales_pct) },
                    ]}
                    rows={[...yearScopedArmateursData].reverse()}
                  />
                </div>
              )}

              {activeSegment === "exploitants" && (
                <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
                  <SectionCard title="Exploitants parc" subtitle={`Stocks par exploitant depuis le 1er janvier ${selectedCumulYear}`}>
                    <div className="h-[380px] min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={yearScopedExploitantsData}>
                          <CartesianGrid {...CHART_GRID_PROPS} />
                          <XAxis dataKey="date_rapport" {...CHART_AXIS_PROPS} tickFormatter={formatShortDate} />
                          <YAxis {...CHART_AXIS_PROPS} />
                          <Tooltip content={<ChartTooltip labelFormatter={formatDateLabel} valueFormatter={(v) => formatInteger(v)} />} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Area type="monotone" dataKey="exp_cma_total" name="CMA" stackId="1" stroke="#0f766e" fill="#0f766e" fillOpacity={0.4} />
                          <Area type="monotone" dataKey="exp_hlc_total" name="HLC" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.35} />
                          <Area type="monotone" dataKey="exp_msk_total" name="MSK" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.35} />
                          <Area type="monotone" dataKey="exp_mgs_total" name="MGS" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.35} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </SectionCard>
                  <DataTable
                    columns={[
                      { key: "date_rapport", label: "Date", render: (r) => formatDateLabel(r.date_rapport) },
                      { key: "exp_cma_total", label: "CMA", align: "right", render: (r) => formatInteger(r.exp_cma_total) },
                      { key: "exp_hlc_total", label: "HLC", align: "right", render: (r) => formatInteger(r.exp_hlc_total) },
                      { key: "exp_msk_total", label: "MSK", align: "right", render: (r) => formatInteger(r.exp_msk_total) },
                      { key: "exp_mgs_total", label: "MGS", align: "right", render: (r) => formatInteger(r.exp_mgs_total) },
                      { key: "exp_grand_total", label: "Total", align: "right", render: (r) => formatInteger(r.exp_grand_total) },
                    ]}
                    rows={[...yearScopedExploitantsData].reverse()}
                  />
                </div>
              )}

              {activeSegment === "kpis" && (
                <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
                  <SectionCard title="KPIs" subtitle={`Productivite et utilisation depuis le 1er janvier ${selectedCumulYear}`}>
                    <div className="h-[380px] min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={yearScopedKpisData}>
                          <CartesianGrid {...CHART_GRID_PROPS} />
                          <XAxis dataKey="date_rapport" {...CHART_AXIS_PROPS} tickFormatter={formatShortDate} />
                          <YAxis {...CHART_AXIS_PROPS} />
                          <Tooltip content={<ChartTooltip labelFormatter={formatDateLabel} />} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Line type="monotone" dataKey="kpi_net_prod_moy_appareilles" name="Prod app." stroke="#10b981" strokeWidth={2.5} dot={false} />
                          <Line type="monotone" dataKey="kpi_net_prod_moy_operation" name="Prod op." stroke="#3b82f6" strokeWidth={2.5} dot={false} />
                          <Line type="monotone" dataKey="kpi_utilisation_globale_pct" name="Utilisation %" stroke="#f59e0b" strokeWidth={2.2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </SectionCard>
                  <DataTable
                    columns={[
                      { key: "date_rapport", label: "Date", render: (r) => formatDateLabel(r.date_rapport) },
                      { key: "kpi_net_prod_moy_appareilles", label: "Prod app.", align: "right", render: (r) => toNumber(r.kpi_net_prod_moy_appareilles).toFixed(1) },
                      { key: "kpi_net_prod_moy_operation", label: "Prod op.", align: "right", render: (r) => toNumber(r.kpi_net_prod_moy_operation).toFixed(1) },
                      { key: "kpi_teu_restant_operation", label: "TEU rest.", align: "right", render: (r) => formatInteger(r.kpi_teu_restant_operation) },
                      { key: "kpi_utilisation_globale_pct", label: "Util.", align: "right", render: (r) => formatPercent(r.kpi_utilisation_globale_pct) },
                      { key: "kpi_ttt_flag", label: "Flag" },
                    ]}
                    rows={[...yearScopedKpisData].reverse()}
                  />
                </div>
              )}

              {activeSegment === "attendus" && (
                <DataTable
                  columns={[
                    { key: "date_rapport", label: "Date", render: (r) => formatDateLabel(r.date_rapport) },
                    { key: "shipping", label: "Ligne", render: (r) => <ShippingBadge rawValue={r.shipping} /> },
                    { key: "nom_navire", label: "Navire" },
                    { key: "service", label: "Service" },
                    { key: "eta", label: "ETA" },
                    { key: "t_units_prevu", label: "T units", align: "right", render: (r) => formatInteger(r.t_units_prevu) },
                  ]}
                  rows={dashboardData.naviresAttendus}
                />
              )}

              {activeSegment === "appareilles" && (
                <DataTable
                  columns={[
                    { key: "date_rapport", label: "Date", render: (r) => formatDateLabel(r.date_rapport) },
                    { key: "shipping", label: "Ligne", render: (r) => <ShippingBadge rawValue={r.shipping} /> },
                    { key: "nom_navire", label: "Navire" },
                    { key: "service", label: "Service" },
                    { key: "atd", label: "ATD" },
                    { key: "net_prod", label: "Prod.", align: "right", render: (r) => toNumber(r.net_prod).toFixed(1) },
                  ]}
                  rows={dashboardData.naviresAppareilles}
                />
              )}

              {activeSegment === "operation" && (
                <DataTable
                  columns={[
                    { key: "date_rapport", label: "Date", render: (r) => formatDateLabel(r.date_rapport) },
                    { key: "shipping", label: "Ligne", render: (r) => <ShippingBadge rawValue={r.shipping} /> },
                    { key: "nom_navire", label: "Navire" },
                    { key: "service", label: "Service" },
                    { key: "rem_units", label: "Rem.", align: "right", render: (r) => formatInteger(r.rem_units) },
                    { key: "pct_complete", label: "Complet", align: "right", render: (r) => formatPercent(r.pct_complete) },
                  ]}
                  rows={dashboardData.naviresOperation}
                />
              )}

              {activeSegment === "escalesOps" && (
                <DataTable
                  columns={[
                    { key: "date_rapport", label: "Date", render: (r) => formatDateLabel(r.date_rapport) },
                    { key: "nom_navire", label: "Navire" },
                    { key: "import_total_teu", label: "Import", align: "right", render: (r) => formatInteger(r.import_total_teu) },
                    { key: "export_total_teu", label: "Export", align: "right", render: (r) => formatInteger(r.export_total_teu) },
                    { key: "transbo_total_teu", label: "Transbo", align: "right", render: (r) => formatInteger(r.transbo_total_teu) },
                  ]}
                  rows={dashboardData.operationsEscales}
                />
              )}

              {activeSegment === "parc" && (
                <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
                  <SectionCard title="Parc conteneurs" subtitle={`Utilise, disponible et taux depuis le 1er janvier ${selectedCumulYear}`}>
                    <div className="h-[380px] min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={yearScopedParcData}>
                          <CartesianGrid {...CHART_GRID_PROPS} />
                          <XAxis dataKey="date_rapport" {...CHART_AXIS_PROPS} tickFormatter={formatShortDate} />
                          <YAxis {...CHART_AXIS_PROPS} />
                          <Tooltip content={<ChartTooltip labelFormatter={formatDateLabel} />} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Line type="monotone" dataKey="parc_conteneurs_utilise" name="Utilise" stroke="#10b981" strokeWidth={2.5} dot={false} />
                          <Line type="monotone" dataKey="parc_conteneurs_disponible" name="Disponible" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
                          <Line type="monotone" dataKey="taux_occupation_parc" name="Tx %" stroke="#8b5cf6" strokeWidth={2.2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </SectionCard>
                  <DataTable
                    columns={[
                      { key: "date_rapport", label: "Date", render: (r) => formatDateLabel(r.date_rapport) },
                      { key: "parc_conteneurs_utilise", label: "Utilise", align: "right", render: (r) => formatInteger(r.parc_conteneurs_utilise) },
                      { key: "parc_conteneurs_total", label: "Capacite", align: "right", render: (r) => formatInteger(r.parc_conteneurs_total) },
                      { key: "taux_occupation_parc", label: "Tx parc", align: "right", render: (r) => formatPercent(r.taux_occupation_parc) },
                      { key: "taux_occupation_reefers", label: "Tx reefer", align: "right", render: (r) => formatPercent(r.taux_occupation_reefers) },
                    ]}
                    rows={[...yearScopedParcData].reverse()}
                  />
                </div>
              )}

              {activeSegment === "rapport" && (
                <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
                  <SectionCard title="Rapport quotidien" subtitle={`Navires attendus, en operation, appareilles depuis le 1er janvier ${selectedCumulYear}`}>
                    <div className="h-[380px] min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={yearScopedRapportData}>
                          <CartesianGrid {...CHART_GRID_PROPS} />
                          <XAxis dataKey="date_rapport" {...CHART_AXIS_PROPS} tickFormatter={formatShortDate} />
                          <YAxis {...CHART_AXIS_PROPS} />
                          <Tooltip content={<ChartTooltip labelFormatter={formatDateLabel} />} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Bar dataKey="nb_navires_attendus" name="Attendus" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                          <Bar dataKey="nb_navires_en_operation" name="En operation" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                          <Bar dataKey="nb_navires_appareilles" name="Appareilles" fill="#10b981" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </SectionCard>
                  <DataTable
                    columns={[
                      { key: "date_rapport", label: "Date", render: (r) => formatDateLabel(r.date_rapport) },
                      { key: "document_numero", label: "Doc." },
                      { key: "nb_navires_appareilles", label: "App.", align: "right", render: (r) => formatInteger(r.nb_navires_appareilles) },
                      { key: "nb_navires_en_operation", label: "Op.", align: "right", render: (r) => formatInteger(r.nb_navires_en_operation) },
                      { key: "nb_navires_attendus", label: "Att.", align: "right", render: (r) => formatInteger(r.nb_navires_attendus) },
                    ]}
                    rows={[...yearScopedRapportData].reverse()}
                  />
                </div>
              )}
            </>
          )}

          {/* ═══════════════ TAB: NAVIRES ═══════════════ */}
          {activeTab === "navires" && (
            <>
              {/* Navires top metrics */}
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <MetricCard label="Volume" value={formatInteger(latestDaily.total_teu)} tone="#10b981" icon={<Activity className="h-4 w-4" />} compact />
                <MetricCard label="Import" value={formatInteger(latestDaily.import_teu)} tone="#3b82f6" icon={<ArrowRightLeft className="h-4 w-4" />} compact />
                <MetricCard label="Export" value={formatInteger(latestDaily.export_teu)} tone="#06b6d4" icon={<ArrowRightLeft className="h-4 w-4" />} compact />
                <MetricCard label="Camions" value={formatInteger(latestGate.ttt_total_camions)} tone="#f59e0b" icon={<Truck className="h-4 w-4" />} compact />
                <MetricCard label="Parc" value={formatInteger(latestDaily.parc_conteneurs_utilise)} tone="#8b5cf6" icon={<Container className="h-4 w-4" />} compact />
              </div>

              {/* Navires attendus + appareilles */}
              <div className="grid gap-5 xl:grid-cols-2">
                <SectionCard title="Navires attendus" subtitle={<><DataBadge type="jour" /> ETA, service, ports et unites prevues</>}>
                  <DataTable
                    columns={[
                      { key: "nom_navire", label: "Navire" },
                      { key: "shipping", label: "Ligne", render: (r) => <ShippingBadge rawValue={r.shipping} /> },
                      { key: "service", label: "Service" },
                      { key: "last_port", label: "Last port" },
                      { key: "eta", label: "ETA" },
                      { key: "t_units_prevu", label: "Units", align: "right", render: (r) => formatInteger(r.t_units_prevu) },
                    ]}
                    rows={dashboardData.naviresAttendus}
                  />
                </SectionCard>
                <SectionCard title="Navires appareilles" subtitle={<><DataBadge type="jour" /> ATB, ATD, productivite et unites</>}>
                  <DataTable
                    columns={[
                      { key: "nom_navire", label: "Navire" },
                      { key: "shipping", label: "Ligne", render: (r) => <ShippingBadge rawValue={r.shipping} /> },
                      { key: "service", label: "Service" },
                      { key: "atb", label: "ATB" },
                      { key: "atd", label: "ATD" },
                      { key: "t_units", label: "Units", align: "right", render: (r) => formatInteger(r.t_units) },
                      { key: "net_prod", label: "Prod.", align: "right", render: (r) => `${toNumber(r.net_prod).toFixed(1)}` },
                    ]}
                    rows={dashboardData.naviresAppareilles}
                  />
                </SectionCard>
              </div>

              {/* Performance + escales */}
              <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                <SectionCard title="Performance navires" subtitle="Productivite nette par navire">
                  <div className="h-[480px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dashboardData.naviresPerformance} layout="vertical">
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis type="number" {...CHART_AXIS_PROPS} />
                        <YAxis type="category" dataKey="nom_navire" {...CHART_AXIS_PROPS} width={120} tickFormatter={(v) => String(v).length > 16 ? `${String(v).slice(0, 16)}...` : String(v)} />
                        <Tooltip content={<ChartTooltip valueFormatter={(v) => `${toNumber(v).toFixed(1)} mvts/h`} />} />
                        <Bar dataKey="net_prod" fill="#10b981" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>

                <SectionCard title="Escales par armateur" subtitle="Repartition des escales realisees de la fiche courante">
                  <div className="h-[340px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={armateurEscalesPie}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={68}
                          outerRadius={118}
                          paddingAngle={2}
                          cornerRadius={4}
                          label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                        >
                          {armateurEscalesPie.map((item) => <Cell key={item.name} fill={item.color} />)}
                        </Pie>
                        <Tooltip content={<ChartTooltip valueFormatter={(v) => formatInteger(v)} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 space-y-2">
                    {armateurEscalesPie.map((item) => (
                      <div key={item.name} className="flex items-center gap-2 text-sm">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-[var(--text-secondary)]">{item.name}</span>
                        <span className="ml-auto font-mono text-[var(--text-primary)]">{formatInteger(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </div>

              {/* Exploitants + Equipment */}
              <div className="grid gap-5 xl:grid-cols-2">
                <SectionCard title="Parc par ligne maritime" subtitle={`Repartition du stock occupe | total ${formatInteger(latestExploitants.exp_grand_total)} unites`}>
                  <div className="h-[360px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={exploitantsBreakdown}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={72}
                          outerRadius={126}
                          paddingAngle={2}
                          cornerRadius={4}
                          label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                        >
                          {exploitantsBreakdown.map((e) => <Cell key={e.name} fill={e.color} />)}
                        </Pie>
                        <Tooltip content={<ChartTooltip valueFormatter={(v) => formatInteger(v)} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {exploitantsBreakdown.map((item) => (
                      <div key={item.name} className="flex items-center gap-2 text-sm">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-[var(--text-secondary)]">{item.name}</span>
                        <span className="ml-auto font-mono text-[var(--text-primary)]">{formatInteger(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </SectionCard>

                <SectionCard title="Composition du parc occupe" subtitle={`Le total correspond exactement au stock occupe (${formatInteger(latestExploitants.exp_grand_total)})`}>
                  <div className="h-[360px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={parkFamilyMix}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={72}
                          outerRadius={126}
                          paddingAngle={2}
                          cornerRadius={4}
                          label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                        >
                          {parkFamilyMix.map((item) => <Cell key={item.name} fill={item.color} />)}
                        </Pie>
                        <Tooltip content={<ChartTooltip valueFormatter={(v) => formatInteger(v)} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 space-y-2">
                    {parkFamilyMix.map((item) => (
                      <div key={item.name} className="flex items-center gap-2 text-sm">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-[var(--text-secondary)]">{item.name}</span>
                        <span className="ml-auto font-mono text-[var(--text-primary)]">{formatInteger(item.value)}</span>
                      </div>
                    ))}
                    <p className="pt-2 text-[12px] text-[var(--text-muted)]">
                      Note : la source parc fournit une decomposition fiable par ligne maritime et par famille d&apos;equipement. Elle ne fournit pas un stock parc direct par plein/vide.
                    </p>
                  </div>
                </SectionCard>
              </div>

              {/* Ports + Cadence */}
              <div className="grid gap-5 xl:grid-cols-2">
                <SectionCard title="Ports amont / aval" subtitle="Origines et destinations">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <div className="mb-3 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <MapPinned className="h-3.5 w-3.5 text-[var(--cyan)]" />
                        <span className="font-medium">Last ports</span>
                      </div>
                      <div className="space-y-2">
                        {portOrigins.map((item, i) => (
                          <div key={item.port} className="flex items-center gap-3">
                            <span className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-[var(--text-muted)]">{i + 1}</span>
                            <span className="flex-1 text-sm text-[var(--text-primary)]">{item.port}</span>
                            <span className="font-mono text-sm text-[var(--cyan)]">{item.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="mb-3 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <MapPinned className="h-3.5 w-3.5 text-[var(--emerald)]" />
                        <span className="font-medium">Next ports</span>
                      </div>
                      <div className="space-y-2">
                        {portDestinations.map((item, i) => (
                          <div key={item.port} className="flex items-center gap-3">
                            <span className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-[var(--text-muted)]">{i + 1}</span>
                            <span className="flex-1 text-sm text-[var(--text-primary)]">{item.port}</span>
                            <span className="font-mono text-sm text-[var(--emerald)]">{item.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="Cadence d'execution" subtitle={`Camions, TTT et productivite depuis le 1er janvier ${selectedCumulYear}`}>
                  <div className="h-[360px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={yearScopedDailyData}>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis dataKey="date_rapport" {...CHART_AXIS_PROPS} tickFormatter={formatShortDate} />
                        <YAxis {...CHART_AXIS_PROPS} />
                        <Tooltip content={<ChartTooltip labelFormatter={formatDateLabel} />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Line type="monotone" dataKey="ttt_total_camions" name="Camions" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
                        <Line type="monotone" dataKey="ttt_duree_minutes" name="TTT (min)" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
                        <Line type="monotone" dataKey="kpi_net_prod_moy_appareilles" name="Prod. nette" stroke="#10b981" strokeWidth={2.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>
              </div>
            </>
          )}

          {/* ═══════════════ TAB: ANALYSE ═══════════════ */}
          {activeTab === "analyse" && (
            <>
              <div className="flex gap-2">
                <AnalyseSubTab active={analyseSubTab === "daily"} label="Journaliere" onClick={() => setAnalyseSubTab("daily")} />
                <AnalyseSubTab active={analyseSubTab === "monthly"} label="Mensuelle" onClick={() => setAnalyseSubTab("monthly")} />
                <AnalyseSubTab active={analyseSubTab === "annual"} label="Annuelle" onClick={() => setAnalyseSubTab("annual")} />
              </div>

              {/* ── Daily Analysis ── */}
              {analyseSubTab === "daily" && dailyAnalysis && (
                <>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard label="Volume jour" value={formatInteger(dailyAnalysis.totalTeu)} tone="#10b981" hint={`Forecast ${formatInteger(dailyAnalysis.forecast)} TEU`} icon={<Activity className="h-4 w-4" />} compact />
                    <MetricCard label="Realisation" value={formatPercent(dailyAnalysis.realisationPct)} tone={dailyAnalysis.realisationPct >= 90 ? "#10b981" : dailyAnalysis.realisationPct >= 75 ? "#f59e0b" : "#f43f5e"} hint={`Ecart ${dailyAnalysis.gapVsForecast >= 0 ? "+" : ""}${formatInteger(dailyAnalysis.gapVsForecast)} TEU`} icon={<Gauge className="h-4 w-4" />} compact />
                    <MetricCard label="Occupation parc" value={formatPercent(dailyAnalysis.occupancyPct)} tone={dailyAnalysis.occupancyPct >= 90 ? "#f43f5e" : "#3b82f6"} hint={`Reefers ${formatPercent(dailyAnalysis.reeferPct)}`} icon={<Container className="h-4 w-4" />} compact />
                    <MetricCard label="Productivite" value={`${dailyAnalysis.productivity.toFixed(1)} mvts/h`} tone="#8b5cf6" hint={`TTT ${formatMinutes(dailyAnalysis.tttMinutes)} | Gate ${formatInteger(dailyAnalysis.gateMovements)} mvts`} icon={<Gauge className="h-4 w-4" />} compact />
                  </div>

                  <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                    <SectionCard title="Performance vs forecast" subtitle={`Evolution realise vs budget depuis le 1er janvier ${selectedCumulYear}`}>
                      <div className="h-[360px] min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={yearScopedDailyData}>
                            <defs>
                              <linearGradient id="gradAnalyseReal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid {...CHART_GRID_PROPS} />
                            <XAxis dataKey="date_rapport" {...CHART_AXIS_PROPS} tickFormatter={formatShortDate} />
                            <YAxis {...CHART_AXIS_PROPS} />
                            <Tooltip content={<ChartTooltip labelFormatter={formatDateLabel} valueFormatter={(v) => formatInteger(v)} />} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Area type="monotone" dataKey="total_teu" name="Realise" stroke="#10b981" fill="url(#gradAnalyseReal)" strokeWidth={2.5} />
                            <Area type="monotone" dataKey="total_forecast" name="Budget" stroke="#3b82f6" fill="none" strokeWidth={2} strokeDasharray="6 3" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </SectionCard>

                    <SectionCard title="Insights du jour" subtitle={`${dailyAnalysis.insights.length} detection(s)`}>
                      <div className="space-y-3 max-h-[360px] overflow-y-auto">
                        {dailyAnalysis.insights.length === 0 ? (
                          <p className="text-[13px] text-[var(--text-muted)]">Aucune anomalie detectee. Operations normales.</p>
                        ) : (
                          dailyAnalysis.insights.map((ins) => <InsightCard key={ins.id} insight={ins} />)
                        )}
                      </div>
                    </SectionCard>
                  </div>

                  <div className="grid gap-5 xl:grid-cols-2">
                    <SectionCard title="Taux d'occupation - Depuis le 1er janvier" subtitle="Parc et reefers sur la periode chargee">
                      <div className="h-[300px] min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={occupancyTrend}>
                            <CartesianGrid {...CHART_GRID_PROPS} />
                            <XAxis dataKey="date_rapport" {...CHART_AXIS_PROPS} tickFormatter={formatShortDate} />
                            <YAxis {...CHART_AXIS_PROPS} domain={[0, 120]} />
                            <Tooltip content={<ChartTooltip labelFormatter={formatDateLabel} valueFormatter={(v) => formatPercent(v)} />} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Line type="monotone" dataKey="taux_occupation_parc" name="Parc %" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 2 }} />
                            <Line type="monotone" dataKey="taux_occupation_reefers" name="Reefers %" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 2 }} />
                            {/* Threshold line at 95% */}
                            <Line type="monotone" dataKey={() => 95} name="Seuil critique" stroke="#f43f5e" strokeWidth={1} strokeDasharray="4 4" dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </SectionCard>

                    <SectionCard title="Productivite - Depuis le 1er janvier" subtitle="Prod. nette et TTT sur la periode chargee">
                      <div className="h-[300px] min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={gateTttTrend}>
                            <CartesianGrid {...CHART_GRID_PROPS} />
                            <XAxis dataKey="date_rapport" {...CHART_AXIS_PROPS} tickFormatter={formatShortDate} />
                            <YAxis yAxisId="left" {...CHART_AXIS_PROPS} />
                            <YAxis yAxisId="right" orientation="right" {...CHART_AXIS_PROPS} />
                            <Tooltip content={<ChartTooltip labelFormatter={formatDateLabel} valueFormatter={(v, name) => String(name).includes("TTT") ? formatMinutes(v) : `${toNumber(v).toFixed(1)} mvts/h`} />} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Line yAxisId="left" type="monotone" dataKey="ttt_duree_minutes" name="TTT" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 2 }} />
                            <Line yAxisId="right" type="monotone" dataKey="ttt_total_camions" name="Camions" stroke="#3b82f6" strokeWidth={2.2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </SectionCard>
                  </div>
                </>
              )}

              {/* ── Monthly Analysis ── */}
              {analyseSubTab === "monthly" && (
                <>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {monthlyAnalyses.slice(-1).map((m) => (
                      <React.Fragment key={m.month}>
                        <MetricCard label={m.monthLabel} value={formatInteger(m.totalTeu)} tone="#10b981" hint={`Realisation ${formatPercent(m.realisationPct)}`} icon={<CalendarRange className="h-4 w-4" />} compact />
                        <MetricCard label="Tendance vs prec." value={`${m.trendVsPrevious >= 0 ? "+" : ""}${m.trendVsPrevious.toFixed(1)}%`} tone={m.trendVsPrevious >= 0 ? "#10b981" : "#f43f5e"} hint={`${m.daysReported} jours rapportes`} icon={<Activity className="h-4 w-4" />} compact />
                        <MetricCard label="Occ. parc moy." value={formatPercent(m.avgOccupancy)} tone={m.avgOccupancy >= 90 ? "#f43f5e" : "#3b82f6"} hint={`TTT moyen ${formatMinutes(m.avgTtt)}`} icon={<Container className="h-4 w-4" />} compact />
                        <MetricCard label="Prod. moyenne" value={`${m.avgProductivity.toFixed(1)} mvts/h`} tone="#8b5cf6" hint={`Gate cumule ${formatInteger(m.totalGateMovements)} mvts`} icon={<Gauge className="h-4 w-4" />} compact />
                      </React.Fragment>
                    ))}
                  </div>

                  <div className="grid gap-5 xl:grid-cols-[1.4fr_0.6fr]">
                    <SectionCard title="Comparaison mensuelle" subtitle="Volume total, realisation et tendance">
                      <div className="h-[400px] min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={monthlyAnalyses}>
                            <CartesianGrid {...CHART_GRID_PROPS} />
                            <XAxis dataKey="monthLabel" {...CHART_AXIS_PROPS} tickFormatter={(v) => String(v).split(" ")[0]?.slice(0, 4) ?? v} />
                            <YAxis {...CHART_AXIS_PROPS} />
                            <Tooltip content={<ChartTooltip valueFormatter={(v) => formatInteger(v)} />} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Bar dataKey="totalTeu" name="Realise" fill="#10b981" radius={[6, 6, 0, 0]} />
                            <Bar dataKey="forecast" name="Budget" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </SectionCard>

                    <SectionCard title="Insights mensuels" subtitle="Dernier mois">
                      <div className="space-y-3 max-h-[400px] overflow-y-auto">
                        {monthlyAnalyses.slice(-1).flatMap((m) => m.insights).length === 0 ? (
                          <p className="text-[13px] text-[var(--text-muted)]">Aucun signal detecte pour ce mois.</p>
                        ) : (
                          monthlyAnalyses.slice(-1).flatMap((m) => m.insights).map((ins) => <InsightCard key={ins.id} insight={ins} />)
                        )}
                      </div>
                    </SectionCard>
                  </div>

                  <SectionCard title="Tableau mensuel detaille" subtitle="KPIs par mois">
                    <DataTable
                      columns={[
                        { key: "monthLabel", label: "Mois" },
                        { key: "totalTeu", label: "Volume", align: "right", render: (r) => formatInteger(r.totalTeu) },
                        { key: "forecast", label: "Budget", align: "right", render: (r) => formatInteger(r.forecast) },
                        { key: "realisationPct", label: "Real. %", align: "right", render: (r) => formatPercent(r.realisationPct) },
                        { key: "trendVsPrevious", label: "Tend. %", align: "right", render: (r) => `${toNumber(r.trendVsPrevious) >= 0 ? "+" : ""}${toNumber(r.trendVsPrevious).toFixed(1)}%` },
                        { key: "avgOccupancy", label: "Occ. %", align: "right", render: (r) => formatPercent(r.avgOccupancy) },
                        { key: "avgTtt", label: "TTT moy.", align: "right", render: (r) => formatMinutes(r.avgTtt) },
                        { key: "avgProductivity", label: "Prod.", align: "right", render: (r) => toNumber(r.avgProductivity).toFixed(1) },
                        { key: "totalGateMovements", label: "Gate", align: "right", render: (r) => formatInteger(r.totalGateMovements) },
                        { key: "daysReported", label: "Jours", align: "right" },
                      ]}
                      rows={monthlyAnalyses as unknown as GenericRow[]}
                    />
                  </SectionCard>
                </>
              )}

              {/* ── Annual Analysis ── */}
              {analyseSubTab === "annual" && annualAnalysis && (
                <>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                    <MetricCard label="Volume annuel" value={formatInteger(annualAnalysis.totalTeu)} tone="#10b981" icon={<Activity className="h-4 w-4" />} compact />
                    <MetricCard label="Moy. mensuelle" value={formatInteger(annualAnalysis.avgMonthlyTeu)} tone="#3b82f6" icon={<CalendarRange className="h-4 w-4" />} compact />
                    <MetricCard label="Meilleur mois" value={annualAnalysis.bestMonth.split(" ")[0] ?? "—"} tone="#10b981" icon={<Activity className="h-4 w-4" />} compact />
                    <MetricCard label="Occ. moy." value={formatPercent(annualAnalysis.avgOccupancy)} tone={annualAnalysis.avgOccupancy >= 85 ? "#f43f5e" : "#3b82f6"} icon={<Container className="h-4 w-4" />} compact />
                    <MetricCard label="Prod. moy." value={`${annualAnalysis.avgProductivity.toFixed(1)}`} tone="#8b5cf6" icon={<Gauge className="h-4 w-4" />} compact />
                    <MetricCard label="Gate total" value={formatInteger(annualAnalysis.totalGateMovements)} tone="#f59e0b" icon={<Truck className="h-4 w-4" />} compact />
                  </div>

                  <div className="grid gap-5 xl:grid-cols-[1.4fr_0.6fr]">
                    <SectionCard title="Tendance de croissance" subtitle="Volume mensuel sur l'annee">
                      <div className="h-[380px] min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={annualAnalysis.months}>
                            <defs>
                              <linearGradient id="gradAnnual" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid {...CHART_GRID_PROPS} />
                            <XAxis dataKey="monthLabel" {...CHART_AXIS_PROPS} tickFormatter={(v) => String(v).split(" ")[0]?.slice(0, 4) ?? v} />
                            <YAxis {...CHART_AXIS_PROPS} />
                            <Tooltip content={<ChartTooltip valueFormatter={(v) => formatInteger(v)} />} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Area type="monotone" dataKey="totalTeu" name="Volume" stroke="#10b981" fill="url(#gradAnnual)" strokeWidth={2.5} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </SectionCard>

                    <SectionCard title="Insights annuels" subtitle={`${annualAnalysis.insights.length} signal(s)`}>
                      <div className="space-y-3 max-h-[380px] overflow-y-auto">
                        {annualAnalysis.insights.length === 0 ? (
                          <p className="text-[13px] text-[var(--text-muted)]">Pas de tendance marquante detectee.</p>
                        ) : (
                          annualAnalysis.insights.map((ins) => <InsightCard key={ins.id} insight={ins} />)
                        )}
                      </div>
                    </SectionCard>
                  </div>

                  <SectionCard title="Comparaison inter-mois" subtitle="Croissance mensuelle">
                    <div className="h-[300px] min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={annualAnalysis.months}>
                          <CartesianGrid {...CHART_GRID_PROPS} />
                          <XAxis dataKey="monthLabel" {...CHART_AXIS_PROPS} tickFormatter={(v) => String(v).split(" ")[0]?.slice(0, 4) ?? v} />
                          <YAxis {...CHART_AXIS_PROPS} />
                          <Tooltip content={<ChartTooltip valueFormatter={(v) => `${toNumber(v) >= 0 ? "+" : ""}${toNumber(v).toFixed(1)}%`} />} />
                          <Bar dataKey="trendVsPrevious" name="Variation %">
                            {annualAnalysis.months.map((m, i) => (
                              <Cell key={i} fill={m.trendVsPrevious >= 0 ? "#10b981" : "#f43f5e"} radius={[6, 6, 0, 0] as unknown as number} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </SectionCard>
                </>
              )}
            </>
          )}

          {/* ═══════════════ TAB: CROISEE ═══════════════ */}
          {activeTab === "croisee" && (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {crossAnalyses.map((ca, index) => (
                  <SectionCard key={index} title={ca.title} subtitle={<span>{ca.xLabel} vs {ca.yLabel} <CorrelationBadge value={ca.correlation} /></span>}>
                    <div className="h-[320px] min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart>
                          <CartesianGrid {...CHART_GRID_PROPS} />
                          <XAxis type="number" dataKey="x" name={ca.xLabel} {...CHART_AXIS_PROPS} />
                          <YAxis type="number" dataKey="y" name={ca.yLabel} {...CHART_AXIS_PROPS} />
                          <ZAxis range={[40, 120]} />
                          <Tooltip
                            content={({ payload }) => {
                              if (!payload?.length) return null;
                              const p = payload[0]?.payload;
                              return (
                                <div className="rounded-lg border border-[var(--card-border)] bg-[var(--tooltip-bg)] p-3 text-[12px] shadow-xl">
                                  <p className="font-medium text-[var(--text-primary)]">{p?.label}</p>
                                  <p className="text-[var(--text-secondary)]">{ca.xLabel}: {formatInteger(p?.x)}</p>
                                  <p className="text-[var(--text-secondary)]">{ca.yLabel}: {formatInteger(p?.y)}</p>
                                </div>
                              );
                            }}
                          />
                          <Scatter data={ca.points} fill="#3b82f6" fillOpacity={0.6} />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  </SectionCard>
                ))}
              </div>

              {crossAnalyses.length === 0 && (
                <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-12 text-center">
                  <p className="text-[var(--text-muted)]">Pas assez de donnees pour les analyses croisees. Selectionnez une periode plus large.</p>
                </div>
              )}

              {crossAnalyses.length > 0 && (
                <SectionCard title="Matrice de correlations" subtitle="Resume des liens entre indicateurs">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {crossAnalyses.map((ca, i) => {
                      const abs = Math.abs(ca.correlation);
                      const bg = abs > 0.7 ? "rgba(16,185,129,0.08)" : abs > 0.4 ? "rgba(245,158,11,0.08)" : "rgba(100,116,139,0.05)";
                      return (
                        <div key={i} className="rounded-xl border border-[var(--card-border)] p-4" style={{ backgroundColor: bg }}>
                          <p className="text-[13px] font-semibold text-[var(--text-primary)]">{ca.title}</p>
                          <div className="mt-2 flex items-center justify-between">
                            <CorrelationBadge value={ca.correlation} />
                            <span className="text-[11px] text-[var(--text-muted)]">{ca.points.length} pts</span>
                          </div>
                          <p className="mt-2 text-[11px] text-[var(--text-secondary)]">
                            {abs > 0.7
                              ? `Lien ${ca.correlation > 0 ? "positif" : "negatif"} fort. Les deux indicateurs evoluent ${ca.correlation > 0 ? "ensemble" : "inversement"}.`
                              : abs > 0.4
                                ? `Lien modere entre ${ca.xLabel} et ${ca.yLabel}.`
                                : `Pas de lien significatif entre ces indicateurs.`}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </SectionCard>
              )}
            </>
          )}

          {/* ═══════════════ TAB: INTELLIGENCE ═══════════════ */}
          {activeTab === "intelligence" && (
            <>
              <SectionCard
                id="intelligence-guide"
                title="Guide d'intelligence et de calcul"
                subtitle="Definition des modules, des modeles, des correlatons et des regles de calcul"
                collapsed={collapsedSections["intelligence-guide"]}
                onToggle={toggleSection}
              >
                <div className="grid gap-4 xl:grid-cols-2">
                  {intelligenceGuideSections.map((section) => (
                    <div key={section.title} className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface-hover)] p-4">
                      <p className="text-[14px] font-semibold text-[var(--text-primary)]">{section.title}</p>
                      <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">{section.description}</p>
                      <div className="mt-3 space-y-2">
                        {section.bullets.map((bullet) => (
                          <div key={bullet} className="flex items-start gap-2 text-[12px] text-[var(--text-secondary)]">
                            <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--cyan)]" />
                            <span>{bullet}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* Summary cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-[var(--insight-critical-border)] bg-[var(--insight-critical-bg)] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#f43f5e]">Critique</p>
                  <p className="mt-2 text-3xl font-bold text-[#f43f5e]">{allInsights.filter((i) => i.level === "critical").length}</p>
                </div>
                <div className="rounded-2xl border border-[var(--insight-warning-border)] bg-[var(--insight-warning-bg)] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#f59e0b]">Attention</p>
                  <p className="mt-2 text-3xl font-bold text-[#f59e0b]">{allInsights.filter((i) => i.level === "warning").length}</p>
                </div>
                <div className="rounded-2xl border border-[var(--insight-info-border)] bg-[var(--insight-info-bg)] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#3b82f6]">Information</p>
                  <p className="mt-2 text-3xl font-bold text-[#3b82f6]">{allInsights.filter((i) => i.level === "info").length}</p>
                </div>
                <div className="rounded-2xl border border-[var(--insight-success-border)] bg-[var(--insight-success-bg)] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#10b981]">Succes</p>
                  <p className="mt-2 text-3xl font-bold text-[#10b981]">{allInsights.filter((i) => i.level === "success").length}</p>
                </div>
              </div>

              <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                <SectionCard title="Criteres de croisement" subtitle="Lecture explicite de ce que l'intelligence compare">
                  <div className="grid gap-3 md:grid-cols-2">
                    {intelligenceCriteria.map((item) => (
                      <div key={item.critere} className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-hover)] p-4">
                        <p className="text-[13px] font-semibold text-[var(--text-primary)]">{item.critere}</p>
                        <p className="mt-1 text-[12px] text-[var(--text-secondary)]">{item.lecture}</p>
                      </div>
                    ))}
                  </div>
                </SectionCard>

                <SectionCard title="Correlations prioritaires" subtitle="Les liens les plus marquants entre indicateurs">
                  <div className="space-y-3">
                    {strongestCorrelations.map((ca, index) => (
                      <div key={`${ca.title}-${index}`} className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-hover)] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[13px] font-semibold text-[var(--text-primary)]">{ca.title}</p>
                          <CorrelationBadge value={ca.correlation} />
                        </div>
                        <p className="mt-2 text-[12px] text-[var(--text-secondary)]">
                          {ca.correlation >= 0
                            ? `${ca.xLabel} et ${ca.yLabel} montent ensemble.`
                            : `${ca.xLabel} et ${ca.yLabel} evoluent en sens inverse.`}
                        </p>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </div>

              {/* All insights */}
              <SectionCard title="Toutes les detections" subtitle={`${allInsights.length} insight(s) aggrege(s) depuis les analyses`}>
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {allInsights.length === 0 ? (
                    <div className="py-8 text-center">
                      <CheckCircle2 className="mx-auto h-10 w-10 text-[var(--emerald)]" />
                      <p className="mt-3 text-[var(--text-secondary)]">Toutes les metriques sont dans les seuils normaux. Aucune anomalie detectee.</p>
                    </div>
                  ) : (
                    allInsights.map((ins) => <InsightCard key={ins.id} insight={ins} />)
                  )}
                </div>
              </SectionCard>

              <div className="grid gap-5 xl:grid-cols-2">
                <SectionCard title="Congestions detectees avant quai" subtitle={`Attente ATA→ATB >= ${congestionWaitThreshold.toFixed(1)} h : congestion, indisponibilite poste ou file d'attente avant quai`}>
                  <DataTable
                    columns={[
                      { key: "dateRapport", label: "Date", render: (r) => formatDateLabel(r.dateRapport) },
                      { key: "vesselName", label: "Navire" },
                      { key: "voyage", label: "Voyage" },
                      { key: "shipping", label: "Ligne" },
                      { key: "loaBucket", label: "LOA" },
                      { key: "ataText", label: "ATA" },
                      { key: "atbText", label: "ATB" },
                      { key: "waitHours", label: "ATA→ATB", align: "right", render: (r) => formatHours(r.waitHours) },
                    ]}
                    rows={congestedCalls as unknown as GenericRow[]}
                    compact
                    maxHeight="360px"
                  />
                </SectionCard>

                <SectionCard title="Navires sous-performes" subtitle="Sous-performe = productivite < 85% de la moyenne de son type de navire (classe LOA)">
                  <DataTable
                    columns={[
                      { key: "dateRapport", label: "Date", render: (r) => formatDateLabel(r.dateRapport) },
                      { key: "vesselName", label: "Navire" },
                      { key: "voyage", label: "Voyage" },
                      { key: "shipping", label: "Ligne" },
                      { key: "loaBucket", label: "LOA" },
                      { key: "units", label: "Units", align: "right", render: (r) => formatInteger(r.units) },
                      { key: "productivity", label: "Prod.", align: "right", render: (r) => `${toNumber(r.productivity).toFixed(1)} mvts/h` },
                      { key: "loaAverageProductivity", label: "Moy. type", align: "right", render: (r) => `${toNumber(r.loaAverageProductivity).toFixed(1)} mvts/h` },
                      { key: "performanceGapPct", label: "Ecart", align: "right", render: (r) => `${toNumber(r.performanceGapPct).toFixed(1)}%` },
                      { key: "operationHours", label: "ATB→ATC", align: "right", render: (r) => formatHours(r.operationHours) },
                    ]}
                    rows={underperformingCalls as unknown as GenericRow[]}
                    compact
                    maxHeight="360px"
                  />
                </SectionCard>
              </div>

              <div className="grid gap-5 xl:grid-cols-3">
                <SectionCard title="Congestion vs occupation parc" subtitle={`Correlation ${describeCorrelationStrength(congestionVsOccupationCorrelation)} (${congestionVsOccupationCorrelation.toFixed(2)}) entre attente moyenne congestionnee et taux moyen du parc`}>
                  <div className="h-[280px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis
                          type="number"
                          dataKey="x"
                          name="Congestion"
                          unit=" h"
                          {...CHART_AXIS_PROPS}
                        />
                        <YAxis
                          type="number"
                          dataKey="y"
                          name="Occupation parc"
                          unit="%"
                          {...CHART_AXIS_PROPS}
                        />
                        <ZAxis dataKey="waitingCount" range={[60, 250]} />
                        <Tooltip
                          content={<ChartTooltip valueFormatter={(value, name) => String(name).includes("Occupation") ? formatPercent(value) : formatHours(value)} />}
                        />
                        <Scatter data={congestionVsOccupationRows} fill="#8b5cf6" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mt-3 text-[12px] text-[var(--text-secondary)]">
                    Lecture : plus la duree moyenne de congestion avant quai augmente, plus le parc a tendance a se tendre
                    {congestionVsOccupationCorrelation >= 0 ? "." : " inversement."}
                  </p>
                </SectionCard>

                <SectionCard title="Productivite quai vs duree a quai" subtitle={`Correlation ${describeCorrelationStrength(quayVsProductivityCorrelation)} (${quayVsProductivityCorrelation.toFixed(2)}) entre productivite nette et temps passe a quai`}>
                  <div className="h-[280px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis type="number" dataKey="x" name="Duree a quai" unit=" h" {...CHART_AXIS_PROPS} />
                        <YAxis type="number" dataKey="y" name="Productivite" {...CHART_AXIS_PROPS} />
                        <Tooltip
                          content={<ChartTooltip valueFormatter={(value, name) => String(name).includes("Duree") ? formatHours(value) : `${toNumber(value).toFixed(1)} mvts/h`} />}
                        />
                        <Scatter data={quayVsProductivityRows} fill="#10b981" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mt-3 text-[12px] text-[var(--text-secondary)]">
                    Lecture : une correlation negative signifie qu&apos;une meilleure productivite nette contribue a reduire la duree moyenne a quai.
                  </p>
                </SectionCard>

                <SectionCard title="Navires en attente vs taux de congestion" subtitle={`Correlation ${describeCorrelationStrength(waitingVsCongestionCorrelation)} (${waitingVsCongestionCorrelation.toFixed(2)}) entre volume d'attente et poids mensuel de la congestion`}>
                  <div className="h-[280px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={waitingVsCongestionRows}>
                        <CartesianGrid {...CHART_GRID_PROPS} />
                        <XAxis dataKey="moisLabel" {...CHART_AXIS_PROPS} />
                        <YAxis yAxisId="left" {...CHART_AXIS_PROPS} />
                        <YAxis yAxisId="right" orientation="right" {...CHART_AXIS_PROPS} />
                        <Tooltip
                          content={<ChartTooltip valueFormatter={(value, name) => String(name).includes("Taux") ? formatPercent(value) : formatInteger(value)} />}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar yAxisId="left" dataKey="waitingCount" name="Navires en attente" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                        <Line yAxisId="right" type="monotone" dataKey="congestionRate" name="Taux de congestion" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mt-3 text-[12px] text-[var(--text-secondary)]">
                    Taux de congestion = part des escales du mois dont l&apos;attente ATA→ATB depasse {congestionWaitThreshold.toFixed(1)} h.
                  </p>
                </SectionCard>
              </div>

              <div className="grid gap-5 xl:grid-cols-3">
                <SectionCard title="Serie mensuelle congestion / parc" subtitle="Base mois 2026 consolides">
                  <DataTable
                    columns={[
                      { key: "moisLabel", label: "Mois" },
                      { key: "avgCongestionHours", label: "Congestion", align: "right", render: (r) => formatHours(r.avgCongestionHours) },
                      { key: "occupancyAvg", label: "Occ. parc", align: "right", render: (r) => formatPercent(r.occupancyAvg) },
                      { key: "waitingCount", label: "Attente", align: "right", render: (r) => formatInteger(r.waitingCount) },
                    ]}
                    rows={congestionVsOccupationRows as unknown as GenericRow[]}
                    compact
                    maxHeight="280px"
                  />
                </SectionCard>
                <SectionCard title="Serie mensuelle quai / productivite" subtitle="Moyennes des escales terminees">
                  <DataTable
                    columns={[
                      { key: "moisLabel", label: "Mois" },
                      { key: "quayHours", label: "Duree a quai", align: "right", render: (r) => formatHours(r.quayHours) },
                      { key: "productivity", label: "Prod nette", align: "right", render: (r) => `${toNumber(r.productivity).toFixed(1)} mvts/h` },
                    ]}
                    rows={quayVsProductivityRows as unknown as GenericRow[]}
                    compact
                    maxHeight="280px"
                  />
                </SectionCard>
                <SectionCard title="Serie mensuelle attente / congestion" subtitle="Escales terminees a la cle voyage">
                  <DataTable
                    columns={[
                      { key: "moisLabel", label: "Mois" },
                      { key: "waitingCount", label: "Navires en attente", align: "right", render: (r) => formatInteger(r.waitingCount) },
                      { key: "congestionRate", label: "Taux congestion", align: "right", render: (r) => formatPercent(r.congestionRate) },
                    ]}
                    rows={waitingVsCongestionRows as unknown as GenericRow[]}
                    compact
                    maxHeight="280px"
                  />
                </SectionCard>
              </div>

              {/* Derived indicators */}
              <div className="grid gap-5 xl:grid-cols-2">
                <SectionCard title="Indicateurs derives" subtitle="Productivite reelle et efficacite operationnelle">
                  <div className="space-y-4">
                    {dailyAnalysis && (
                      <>
                        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-hover)] p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">Productivite reelle</p>
                              <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{dailyAnalysis.productivity.toFixed(1)} <span className="text-sm text-[var(--text-muted)]">mvts/h</span></p>
                            </div>
                            <div className={`rounded-full px-3 py-1 text-[12px] font-medium ${dailyAnalysis.productivity >= 25 ? "bg-emerald-500/10 text-[var(--emerald)]" : dailyAnalysis.productivity >= 20 ? "bg-amber-500/10 text-amber-400" : "bg-rose-500/10 text-rose-400"}`}>
                              {dailyAnalysis.productivity >= 25 ? "Excellent" : dailyAnalysis.productivity >= 20 ? "Normal" : "Faible"}
                            </div>
                          </div>
                        </div>
                        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-hover)] p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">Efficacite operationnelle</p>
                              <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{dailyAnalysis.realisationPct.toFixed(1)}<span className="text-sm text-[var(--text-muted)]">%</span></p>
                            </div>
                            <div className={`rounded-full px-3 py-1 text-[12px] font-medium ${dailyAnalysis.realisationPct >= 95 ? "bg-emerald-500/10 text-[var(--emerald)]" : dailyAnalysis.realisationPct >= 80 ? "bg-amber-500/10 text-amber-400" : "bg-rose-500/10 text-rose-400"}`}>
                              {dailyAnalysis.realisationPct >= 95 ? "Optimal" : dailyAnalysis.realisationPct >= 80 ? "Acceptable" : "Sous-performance"}
                            </div>
                          </div>
                        </div>
                        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-hover)] p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">Charge parc</p>
                              <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{dailyAnalysis.occupancyPct.toFixed(1)}<span className="text-sm text-[var(--text-muted)]">%</span></p>
                            </div>
                            <div className={`rounded-full px-3 py-1 text-[12px] font-medium ${dailyAnalysis.occupancyPct >= 95 ? "bg-rose-500/10 text-rose-400" : dailyAnalysis.occupancyPct >= 85 ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-[var(--emerald)]"}`}>
                              {dailyAnalysis.occupancyPct >= 95 ? "Saturation" : dailyAnalysis.occupancyPct >= 85 ? "Tension" : "Fluide"}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </SectionCard>

                <SectionCard title="Suggestions automatiques" subtitle="Recommandations basees sur les donnees">
                  <div className="space-y-4">
                    {dailyAnalysis && dailyAnalysis.occupancyPct >= 85 && (
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                        <p className="text-[13px] font-semibold text-amber-400">Risque de saturation parc</p>
                        <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
                          Le taux d&apos;occupation du parc est a {dailyAnalysis.occupancyPct.toFixed(1)}%. Envisager une acceleration des livraisons sortantes ou une extension des horaires gate.
                        </p>
                      </div>
                    )}
                    {dailyAnalysis && dailyAnalysis.realisationPct < 85 && dailyAnalysis.realisationPct > 0 && (
                      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                        <p className="text-[13px] font-semibold text-blue-400">Activite faible vs forecast</p>
                        <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
                          Ecart de {Math.abs(dailyAnalysis.gapVsForecast).toLocaleString("fr-FR")} TEU par rapport au budget. Verifier les escales prevues et les retards potentiels.
                        </p>
                      </div>
                    )}
                    {dailyAnalysis && dailyAnalysis.tttMinutes > 60 && (
                      <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                        <p className="text-[13px] font-semibold text-violet-400">TTT eleve</p>
                        <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
                          Le temps de rotation des camions est de {formatMinutes(dailyAnalysis.tttMinutes)}. Verifier la fluidite du processus gate et les causes de congestion.
                        </p>
                      </div>
                    )}
                    {dailyAnalysis && dailyAnalysis.realisationPct >= 95 && (
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                        <p className="text-[13px] font-semibold text-[var(--emerald)]">Performance optimale</p>
                        <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
                          Objectifs budgetaires atteints ou depasses. Maintenir le rythme operationnel actuel.
                        </p>
                      </div>
                    )}
                    {(!dailyAnalysis || (dailyAnalysis.occupancyPct < 85 && dailyAnalysis.realisationPct >= 85 && dailyAnalysis.tttMinutes <= 60)) && (
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                        <p className="text-[13px] font-semibold text-[var(--emerald)]">Operations normales</p>
                        <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
                          Tous les indicateurs sont dans les normes. Aucune action corrective necessaire.
                        </p>
                      </div>
                    )}
                  </div>
                </SectionCard>
              </div>

            </>
          )}
          {activeTab === "chat" && (
            <SectionCard
              id="chat-ia"
              title="Chat IA"
              subtitle="Session conversationnelle persistante, lecture metier et synthese exploitable"
              collapsed={collapsedSections["chat-ia"]}
              onToggle={toggleSection}
            >
              <ChatPanel />
            </SectionCard>
          )}
        </main>
      </div>
    </div>
  );
}
