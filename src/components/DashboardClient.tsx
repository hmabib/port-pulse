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
  Database,
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
  RefreshCw,
  Ship,
  Truck,
  X,
  XCircle,
} from "lucide-react";
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
import { ETC_MODEL, INTELLIGENCE_THRESHOLDS, hasSufficientPearsonSample } from "@/lib/intelligence-config";
/** Synthèse de qualité calculée au rendu serveur. */
export interface DataQualitySummary {
  duplicatesRemoved: number;
  coveragePct: number | null;
  reportedDays: number;
  missingDays: number;
  gaps: Array<{ from: string; to: string; days: number }>;
  lastBulletin: string;
}
import { SEGMENT_ITEMS, VIEW_LABELS, type MainTabId, type MenuEntryId, type SegmentId } from "./ui/Navigation";
import { VIEW_QUESTIONS, type ChatContext, type ChatKpi } from "@/lib/chat-context";
import { BAR_VALUE_LABEL, BAR_VALUE_LABEL_RIGHT, withTrendBreaks } from "@/lib/chart-config";
import { GenericRow, FilterOptions, InitialData, WeekdayHeatmapRow, GuideSection, FLOW_COLORS, DAILY_REFRESH_HOUR, toNumber, toText, formatChartExportLabel, buildVisibleChartLabel, renderExportPieValueLabel, filterRowsSinceYearStart, buildParcTrendRows, formatInteger, formatPercent, formatSignedInteger, formatMinutes, formatDateLabel, formatDateTimeLabel, formatShortDate, normalizeDateValue, resolveRowDate, formatRowDate, getLatestDateFromRows, filterRowsByDate, getLatestRows, getLatestReportRow, formatMonthAxisLabel, getDateBounds, formatHours, formatDateTimeCompact, buildCompletedCalls, buildCompletedCallShippingMonthlyRows, buildCompletedCallShippingStats, buildCompletedCallLoaStats, buildMonthlyTrafficRows, buildMonthlyCycleRows, buildMonthlyProductivityByShipping, buildMonthlyProductivityByLoa, computePearsonCorrelation, describeCorrelationStrength, getCorrelationWarning, buildCongestionVsOccupationRows, buildMonthlyQuayVsProductivityRows, buildWaitingCountVsCongestionRateRows, buildCapacityAlerts, isJustInTime, getProductivityAppreciation, buildActiveOperationPredictions, buildServiceRecap, buildWeekdayAverages, buildPortFocus, buildExploitantsBreakdown, buildParkFamilyMix, buildFlowMix, buildArmateurProgress, buildArmateurEscalesPie, buildShippingPerformance, buildYardLineRows, buildSituationEscaleRows, buildCumul2026MonthlyRows, buildYearWeekdayHeatmapRows, buildMonthlyBulletin } from "@/lib/dashboard-metrics";
import MetricCard from "./ui/MetricCard";
import DataTable from "./ui/DataTable";
import SectionCard from "./ui/SectionCard";
import ChartTooltip, { CHART_GRID_PROPS, CHART_AXIS_PROPS } from "./ui/ChartTooltip";
import ShippingBadge from "./ui/ShippingBadge";
import OccupancyGauge from "./ui/Gauge";

import Navigation from "./ui/Navigation";
import ChatPanel from "./ChatPanel";
import DataQualityView, { type DataQualityDetails } from "./views/DataQualityView";
import SourcesView from "./views/SourcesView";
import PilotageView from "./views/PilotageView";
import PerformanceView from "./views/PerformanceView";
import OperationsView from "./views/OperationsView";
import AnalyseView from "./views/AnalyseView";

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
  critical: "#f87171",
  warning: "#5fb0e8",
  info: "#164b7e",
  success: "#2e90d9",
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
  const color = abs > 0.7 ? "#2e90d9" : abs > 0.4 ? "#5fb0e8" : "#64748b";
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

/**
 * Bandeau de qualité des données.
 *
 * Un cockpit qui masque ses trous perd la confiance de son pilote plus vite
 * qu'un cockpit qui les affiche. Les doublons écartés et les jours sans
 * bulletin sont donc rendus visibles en permanence, sans dramatisation.
 */
function DataQualityBanner({ quality }: { quality: DataQualitySummary | null }) {
  if (!quality) return null;

  const { duplicatesRemoved, coveragePct, reportedDays, missingDays, gaps } = quality;
  const hasSignal = duplicatesRemoved > 0 || missingDays > 0;
  if (!hasSignal) return null;

  const severe = coveragePct !== null && coveragePct < 80;

  return (
    <section
      className={`rounded-2xl border p-4 text-[13px] theme-transition ${
        severe
          ? "border-[var(--insight-warning-border)] bg-[var(--insight-warning-bg)]"
          : "border-[var(--card-border)] bg-[var(--card-bg)]"
      }`}
    >
      <div className="flex flex-wrap items-start gap-x-6 gap-y-2">
        <div className="flex items-center gap-2 text-[var(--text-primary)]">
          <Database className="h-4 w-4 flex-shrink-0 text-[var(--text-muted)]" />
          <span className="font-semibold">Qualité des données</span>
        </div>

        <span className="text-[var(--text-secondary)]">
          <strong className="text-[var(--text-primary)]">{reportedDays}</strong> bulletins exploités
          {coveragePct !== null && <> · couverture <strong className="text-[var(--text-primary)]">{coveragePct}&nbsp;%</strong></>}
        </span>

        {duplicatesRemoved > 0 && (
          <span className="text-[var(--text-secondary)]">
            <strong className="text-[var(--text-primary)]">{duplicatesRemoved}</strong> doublon
            {duplicatesRemoved > 1 ? "s" : ""} de bulletin écarté{duplicatesRemoved > 1 ? "s" : ""}
          </span>
        )}

        {missingDays > 0 && (
          <span className="text-[var(--text-secondary)]">
            <strong className="text-[var(--text-primary)]">{missingDays}</strong> jour
            {missingDays > 1 ? "s" : ""} sans bulletin — les moyennes journalières portent sur les jours renseignés
          </span>
        )}
      </div>

      {gaps.length > 0 && (
        <p className="mt-2 text-[12px] text-[var(--text-muted)]">
          Interruptions principales :{" "}
          {gaps.map((gap, index) => (
            <span key={`${gap.from}-${gap.to}`}>
              {index > 0 && " · "}
              {formatShortDate(gap.from)} → {formatShortDate(gap.to)} ({gap.days}&nbsp;j)
            </span>
          ))}
        </p>
      )}
    </section>
  );
}

export default function DashboardClient({
  filterOptions,
  initialData,
  initialTab = "situation",
  initialSegment = "global",
  visibleMenuItems,
  serverError = null,
  quality = null,
  qualityDetails = null,
}: {
  filterOptions: FilterOptions;
  initialData: InitialData;
  initialTab?: MainTabId;
  initialSegment?: SegmentId;
  visibleMenuItems?: MenuEntryId[];
  serverError?: string | null;
  quality?: DataQualitySummary | null;
  qualityDetails?: DataQualityDetails | null;
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
  const [refreshTick, setRefreshTick] = useState(0);
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
    const shouldFetch = hasFilters || refreshTick > 0;
    if (!shouldFetch) { setDashboardData(initialData); return; }

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
  }, [day, filterOptions.shippingLines, initialData, month, refreshTick, shipping, year]);

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
    const totalGateAverageDays = cumul2026Monthly.reduce((s, r) => s + r.gateAverageDayCount, 0) || 1;
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
      totalMouvements: cumul2026Monthly.reduce((s, r) => s + (r.mouvementsAvgJour * r.gateAverageDayCount), 0),
      tauxRealisationLast: totalForecast > 0 ? (totalTeu / totalForecast) * 100 : 0,
      occupationAvg: cumul2026Monthly.reduce((s, r) => s + (r.occupationAvg * r.occupancyDayCount), 0) / totalDailyCount,
      reefersAvg: cumul2026Monthly.reduce((s, r) => s + (r.reefersAvg * r.occupancyDayCount), 0) / totalDailyCount,
      tttAvg: cumul2026Monthly.reduce((s, r) => s + (r.tttAvg * r.gateAverageDayCount), 0) / totalGateAverageDays,
      camionsAvgJour: cumul2026Monthly.reduce((s, r) => s + (r.camionsAvgJour * r.gateAverageDayCount), 0) / totalGateAverageDays,
      mouvementsAvgJour: cumul2026Monthly.reduce((s, r) => s + (r.mouvementsAvgJour * r.gateAverageDayCount), 0) / totalGateAverageDays,
      entreesTotalAvgJour: cumul2026Monthly.reduce((s, r) => s + (r.entreesTotalAvgJour * r.gateAverageDayCount), 0) / totalGateAverageDays,
      sortiesTotalAvgJour: cumul2026Monthly.reduce((s, r) => s + (r.sortiesTotalAvgJour * r.gateAverageDayCount), 0) / totalGateAverageDays,
      sortiesPleinAvgJour: cumul2026Monthly.reduce((s, r) => s + (r.sortiesPleinAvgJour * r.gateAverageDayCount), 0) / totalGateAverageDays,
      sortiesVideAvgJour: cumul2026Monthly.reduce((s, r) => s + (r.sortiesVideAvgJour * r.gateAverageDayCount), 0) / totalGateAverageDays,
      entreesPleinAvgJour: cumul2026Monthly.reduce((s, r) => s + (r.entreesPleinAvgJour * r.gateAverageDayCount), 0) / totalGateAverageDays,
      entreesVideAvgJour: cumul2026Monthly.reduce((s, r) => s + (r.entreesVideAvgJour * r.gateAverageDayCount), 0) / totalGateAverageDays,
      productivityAverage: cumul2026Monthly.reduce((s, r) => s + (r.productivityAverage * r.productivityCount), 0) / totalProductivityCount,
      monthCount,
      totalGateDays: totalGateAverageDays,
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
  /* Les séries journalières sont ponctuées de trous de collecte : une valeur
     nulle est insérée au-delà de trois jours sans bulletin pour que la courbe
     se rompe au lieu de laisser croire à une évolution continue observée. */
  const occupancyTrend = useMemo(
    () =>
      withTrendBreaks(buildParcTrendRows(dashboardData.parcConteneurs, selectedCumulYear), [
        "parc_conteneurs_utilise",
        "parc_conteneurs_disponible",
        "variation_utilise",
        "taux_occupation_parc",
        "taux_occupation_reefers",
      ]),
    [dashboardData.parcConteneurs, selectedCumulYear],
  );
  const gateFlowTrend = useMemo(
    () =>
      withTrendBreaks(filterRowsSinceYearStart(dashboardData.gateData, selectedCumulYear), [
        "gate_entrees_pleins",
        "gate_entrees_vides",
        "gate_sorties_pleins",
        "gate_sorties_vides",
        "gate_total_mouvements",
      ]),
    [dashboardData.gateData, selectedCumulYear],
  );
  const gateTttTrend = useMemo(
    () =>
      withTrendBreaks(filterRowsSinceYearStart(dashboardData.gateData, selectedCumulYear), [
        "ttt_duree_minutes",
        "ttt_total_camions",
        "ttt_total_conteneurs",
      ]),
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
      .filter((call) => call.productivity > 0 && toNumber(call.loaAverageProductivity) > 0 && call.productivity < (toNumber(call.loaAverageProductivity) * INTELLIGENCE_THRESHOLDS.underperformingLoaRatio))
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
        `Les estimations ETC melangent productivite observee et historique avec un poids ${(ETC_MODEL.observedProductivityWeight * 100).toFixed(0)}/${(ETC_MODEL.historicalProductivityWeight * 100).toFixed(0)}.`,
        `Quand le bulletin note seulement AM/PM, ETC est interprete a ${String(ETC_MODEL.bulletinAmHourUtc).padStart(2, "0")}:00 UTC pour AM et ${String(ETC_MODEL.bulletinPmHourUtc).padStart(2, "0")}:00 UTC pour PM.`,
      ],
    },
    {
      title: "Module Cumul 2026",
      description: "Le cumul annuel somme, pour chaque mois, les valeurs les plus elevees constatees dans le dernier bulletin disponible du mois.",
      bullets: [
        "Import, export, transbo, pleins derives, vides et total sont consolides mois par mois.",
        "Les escales realisees suivent la meme logique de snapshot mensuel.",
        "Les moyennes gate, TTT, occupation et productivite sont calculees sur les jours disponibles de chaque mois.",
        "Les moyennes gate mensuelles sont harmonisees sur les jours gate actifs pour garder le meme diviseur entre TTT, camions, mouvements, entrees et sorties.",
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
        `Sous-performance = productivite navire inferieure a ${(INTELLIGENCE_THRESHOLDS.underperformingLoaRatio * 100).toFixed(0)}% de la moyenne de sa classe LOA.`,
        `Les correlations affichent le coefficient de Pearson r, entre -1 et +1, uniquement a partir de ${INTELLIGENCE_THRESHOLDS.pearsonMinPoints} points minimum.`,
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

  const activeFilters = useMemo(() => {
    const filters: { label: string; clear: () => void }[] = [];
    if (year) filters.push({ label: `Annee ${year}`, clear: () => setYear("") });
    if (month) filters.push({ label: filterOptions.months.find((m) => String(m.num) === month)?.name ?? month, clear: () => setMonth("") });
    if (day) filters.push({ label: `Jour ${day}`, clear: () => setDay("") });
    if (activeShippingOption) filters.push({ label: activeShippingOption.label, clear: () => setShipping("") });
    return filters;
  }, [activeShippingOption, day, filterOptions.months, month, year]);
  const showGlobalFilters = activeTab !== "bulletin";

  /**
   * Contexte transmis à l'assistant à chaque question.
   * Il porte la vue, la période, les filtres, les indicateurs réellement
   * affichés et l'état de couverture, afin qu'une question de suivi comme
   * « et la productivité ? » hérite du périmètre que l'utilisateur regarde.
   */
  const chatContext = useMemo<ChatContext>(() => {
    const bounds = getDateBounds(year, month, day);
    const view = VIEW_QUESTIONS[activeTab] ?? VIEW_QUESTIONS.situation;
    const vueLabel =
      activeTab === "segments"
        ? `Données sources — ${SEGMENT_ITEMS.find((s) => s.id === activeSegment)?.label ?? activeSegment}`
        : view.label;

    const periodeLabel = bounds
      ? `du ${formatDateLabel(bounds.startDate)} au ${formatDateLabel(bounds.endDate)}`
      : activeTab === "situation"
        ? `bulletin du ${formatDateLabel(situationReferenceDate)}`
        : `année ${selectedCumulYear}`;

    const kpis: ChatKpi[] = [];
    if (activeTab === "situation") {
      kpis.push(
        { label: "Cumul du mois", value: formatInteger(situationDaily.total_teu), unit: "TEU" },
        { label: "Occupation parc", value: formatPercent(situationParc.taux_occupation_parc) },
        { label: "TTT", value: formatMinutes(situationGate.ttt_duree_minutes) },
        { label: "Navires en opération", value: formatInteger(situationOperation.length) },
      );
    } else if (activeTab === "cumul2026") {
      kpis.push(
        { label: `EVP cumulés ${selectedCumulYear}`, value: formatInteger(cumul2026Annual.totalTeu), unit: "TEU" },
        { label: "Escales réalisées", value: formatInteger(cumul2026Annual.escalesRealisees) },
        { label: "Occupation moyenne", value: `${cumul2026Annual.occupationAvg.toFixed(0)} %` },
      );
    }

    return {
      vue: activeTab,
      vueLabel,
      questionVue: view.question,
      periode: {
        debut: bounds?.startDate ?? null,
        fin: bounds?.endDate ?? null,
        label: periodeLabel,
      },
      filtres: {
        annee: year || undefined,
        mois: month || undefined,
        jour: day || undefined,
        armateur: activeShippingOption?.label,
      },
      bulletinActif: situationReferenceDate || latestDashboardDate,
      kpis,
      alertes: bulletinCapacityAlerts
        .filter((alert) => alert.level !== "info")
        .map((alert) => `${alert.title} — ${alert.description}`),
      qualite: {
        bulletinsExploites: quality?.reportedDays ?? dashboardData.dailyData.length,
        joursManquants: quality?.missingDays ?? 0,
        couverturePct: quality?.coveragePct ?? null,
      },
    };
  }, [
    activeSegment,
    activeShippingOption,
    activeTab,
    cumul2026Annual,
    bulletinCapacityAlerts,
    dashboardData.dailyData.length,
    day,
    latestDashboardDate,
    month,
    quality,
    selectedCumulYear,
    situationDaily,
    situationGate,
    situationOperation,
    situationParc,
    situationReferenceDate,
    year,
  ]);

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
            <section className="rounded-2xl border border-[var(--insight-critical-border)] bg-[var(--insight-critical-bg)] p-4 text-sm text-[var(--text-primary)]">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--critical)]" />
                <div>
                  <p className="font-semibold">Mode dégradé</p>
                  <p className="mt-1 text-[var(--text-secondary)]">{serverError}</p>
                </div>
              </div>
            </section>
          )}

          <DataQualityBanner quality={quality} />

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
                  {/* Libellé unique : identique au menu, à l'export PDF et à
                      l'assistant. Le titre et l'entrée de menu divergeaient
                      sur six vues, ce qui obligeait à apprendre deux noms. */}
                  <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                    {activeTab === "segments"
                      ? `Données sources — ${SEGMENT_ITEMS.find((s) => s.id === activeSegment)?.label ?? "Vue globale"}`
                      : activeTab === "cumul2026"
                        ? `Cumul annuel ${selectedCumulYear}`
                        : VIEW_LABELS[activeTab] ?? "Pilotage"}
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
                    {activeTab === "quality" && <>Couverture, doublons et rejets des 30 derniers jours</>}
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
                  onClick={() => setRefreshTick((value) => value + 1)}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--surface-hover)] px-3.5 py-2 text-[13px] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                  title="Actualiser les donnees"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                  Actualiser
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
                              { key: "escales", label: "Escales", format: "number" as const },
                              { key: "waitHours", label: "Attente (h)", format: "decimal" as const },
                              { key: "operationHours", label: "Operations (h)", format: "decimal" as const },
                              { key: "postOpsHours", label: "Post-ops (h)", format: "decimal" as const },
                              { key: "totalCycleHours", label: "Cycle total (h)", format: "decimal" as const },
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
                              { key: "rem_units", label: "Restant", format: "number" as const },
                              { key: "observedProd", label: "Prod obs.", format: "decimal" as const },
                              { key: "modeledProd", label: "Prod modele", format: "decimal" as const },
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
                                { key: "importTeu", label: "Import", format: "number" as const },
                                { key: "exportTeu", label: "Export", format: "number" as const },
                                { key: "transboTeu", label: "Transbo", format: "number" as const },
                                { key: "pleinsTeu", label: "Pleins", format: "number" as const },
                                { key: "videsTeu", label: "Vides", format: "number" as const },
                                { key: "totalTeu", label: "Total", format: "number" as const },
                              ],
                              chartImage: chartImages[0],
                            },
                            {
                              title: "Escales par ligne maritime",
                              rows: cumul2026Shipping as unknown as GenericRow[],
                              columns: [
                                { key: "moisLabel", label: "Mois" },
                                { key: "shipping", label: "Ligne" },
                                { key: "escales", label: "Escales", format: "number" as const },
                                { key: "units", label: "EVP", format: "number" as const },
                                { key: "productivity", label: "Prod (mvts/h)", format: "decimal" as const },
                              ],
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
                                  `Les coefficients r sont des correlations de Pearson calculees sur les series mensuelles consolidees avec un minimum de ${INTELLIGENCE_THRESHOLDS.pearsonMinPoints} points.`,
                                  "Une valeur proche de 1 indique un lien positif fort, proche de -1 un lien negatif fort.",
                                ],
                              },
                              {
                                title: "Corrélations prioritaires",
                                rows: strongestCorrelations as unknown as GenericRow[],
                                columns: [
                                  { key: "title", label: "Croisement" },
                                  { key: "xLabel", label: "Axe X" },
                                  { key: "yLabel", label: "Axe Y" },
                                  { key: "correlation", label: "Coefficient r", format: "decimal" as const },
                                ],
                                chartImage: chartImages[0],
                              },
                              {
                                title: "Navires sous-performes",
                                rows: underperformingCalls as unknown as GenericRow[],
                                columns: [
                                  { key: "vesselName", label: "Navire" },
                                  { key: "shipping", label: "Ligne" },
                                  { key: "loaBucket", label: "LOA" },
                                  { key: "units", label: "EVP", format: "number" as const },
                                  { key: "productivity", label: "Prod (mvts/h)", format: "decimal" as const },
                                  { key: "quayHours", label: "Quai (h)", format: "decimal" as const },
                                  { key: "monthKey", label: "Mois" },
                                ],
                                chartImage: chartImages[1],
                                intro: `Sous-performance = productivite du navire inferieure a ${(INTELLIGENCE_THRESHOLDS.underperformingLoaRatio * 100).toFixed(0)}% de la moyenne de sa classe LOA.`,
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
              {(["situation", "cumul2026", "operations", "bulletin", "quality", "segments", "navires", "analyse", "croisee", "intelligence", "chat"] as MainTabId[]).map((tab) => {
                const labels: Record<string, string> = VIEW_LABELS;
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

          {activeTab !== "chat" && activeTab !== "quality" && (
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
                  tone="#2e90d9"
                  hint={`Bulletin ${formatDateLabel(situationReferenceDate)} | Budget ${formatInteger(situationDaily.total_forecast)} TEU`}
                  icon={<Gauge className="h-4 w-4" />}
                  delta={toNumber(situationDaily.total_teu) - toNumber(situationDaily.total_forecast)}
                  sparkData={dailySpark}
                />
                <MetricCard
                  label="Volume cumul mois"
                  value={formatInteger(situationDaily.total_teu)}
                  tone="#164b7e"
                  hint={`Cumul mois | Import ${formatInteger(situationDaily.import_teu)} | Export ${formatInteger(situationDaily.export_teu)}`}
                  icon={<Activity className="h-4 w-4" />}
                  sparkData={dailySpark}
                />
                <MetricCard
                  label="Gate jour"
                  value={`${formatInteger(situationGate.ttt_total_camions)} cam.`}
                  tone="#5fb0e8"
                  hint={`Jour ${formatDateLabel(situationReferenceDate)} | ${formatInteger(situationGate.gate_total_mouvements)} mvts | TTT ${formatMinutes(situationGate.ttt_duree_minutes)}`}
                  icon={<Truck className="h-4 w-4" />}
                  sparkData={gateSpark}
                />
                <MetricCard
                  label="Occupation parc"
                  value={formatPercent(situationParc.taux_occupation_parc)}
                  tone="#93cbf2"
                  hint={`Jour ${formatDateLabel(situationReferenceDate)} | ${formatInteger(situationParc.parc_conteneurs_utilise)} / ${formatInteger(situationParc.parc_conteneurs_total)} EVP`}
                  icon={<Container className="h-4 w-4" />}
                  sparkData={parcSpark}
                />
              </div>
            </SectionCard>
          )}

          {/* ═══════════════ TAB: SITUATION ═══════════════ */}
          {activeTab === "situation" && <PilotageView ctx={{ Activity, ArrowRightLeft, BAR_VALUE_LABEL, Bar, BarChart, CHART_AXIS_PROPS, CHART_GRID_PROPS, CalendarRange, CartesianGrid, ChartTooltip, Container, DataBadge, DataTable, Gauge, JitStatusBadge, LabelList, Legend, Line, LineChart, MetricCard, OccupancyGauge, ProgressBar, ResponsiveContainer, SectionCard, Ship, ShippingBadge, Tooltip, Truck, XAxis, YAxis, buildArmateurProgress, exportReceptionRate, formatChartExportLabel, formatDateLabel, formatDateTimeCompact, formatDateTimeLabel, formatInteger, formatMinutes, formatPercent, formatShortDate, formatSignedInteger, gateContainersPerTruck, gateFlowTrend, gateFullShare, gateInboundShare, gateOutboundShare, getProductivityAppreciation, isJustInTime, isPngExporting, naviresAppareillesUnits, naviresAttendusUnits, naviresOperationCompletion, naviresOperationRemaining, naviresOperationUnits, occupancyDelta, occupancyTrend, parcAvailabilityPct, parcDelta, pleinsParcTotal, reeferAvailabilityPct, reeferDelta, shippingPerformance, situationAppareilles, situationArmateurs, situationAttendus, situationCollectedAt, situationDaily, situationEscales, situationExploitants, situationGate, situationKpi, situationOperation, situationOperationRowsEnriched, situationParc, situationRecoveryDate, situationReferenceDate, toNumber, transboBalance, yardLineRows }} />}
          <PerformanceView activeView={activeTab} cumulContext={{ Activity, Area, AreaChart, ArrowRightLeft, BAR_VALUE_LABEL, Bar, BarChart, CHART_AXIS_PROPS, CHART_GRID_PROPS, CartesianGrid, ChartTooltip, Container, DataBadge, DataTable, Gauge, Legend, Line, LineChart, MetricCard, ResponsiveContainer, SectionCard, Ship, ShippingBadge, Tooltip, Truck, WeekdayHeatmap, XAxis, YAxis, collapsedSections, cumul2026Annual, cumul2026Monthly, cumul2026Shipping, cumul2026ShippingAnnual, cumul2026WeekdayHeatmap, formatChartExportLabel, formatDateLabel, formatHours, formatInteger, formatMinutes, formatMonthAxisLabel, formatPercent, isPngExporting, monthlyCycleRows, selectedCumulYear, toNumber, toggleSection }} bulletinContext={{ Bar, BarChart, BulletinManager, CHART_AXIS_PROPS, CHART_GRID_PROPS, CartesianGrid, ChartTooltip, DataTable, JitStatusBadge, Legend, Line, LineChart, ProgressBar, ResponsiveContainer, SectionCard, Tooltip, XAxis, YAxis, activeBulletin, armateurProgress, buildVisibleChartLabel, bulletinCapacityAlerts, bulletinOperationPredictions, collapsedSections, formatDateLabel, formatDateTimeCompact, formatInteger, formatMinutes, formatMonthAxisLabel, formatPercent, formatShortDate, isJustInTime, monthlyBulletin, router, selectedBulletin, setSelectedBulletin, toNumber, toggleSection, weekdayAverages, yearScopedDailyData }} kpiContext={{ Activity, AnalyseSubTab, Area, AreaChart, Bar, BarChart, CHART_AXIS_PROPS, CHART_GRID_PROPS, CalendarRange, CartesianGrid, Cell, ChartTooltip, Container, DataTable, Gauge, INTELLIGENCE_THRESHOLDS, InsightCard, Legend, Line, LineChart, MetricCard, ResponsiveContainer, SectionCard, Tooltip, Truck, XAxis, YAxis, analyseSubTab, annualAnalysis, buildVisibleChartLabel, dailyAnalysis, formatDateLabel, formatInteger, formatMinutes, formatPercent, formatShortDate, gateTttTrend, monthlyAnalyses, occupancyTrend, selectedCumulYear, setAnalyseSubTab, toNumber, yearScopedDailyData }} />
          <OperationsView activeView={activeTab} escalesContext={{ Area, AreaChart, BAR_VALUE_LABEL, BAR_VALUE_LABEL_RIGHT, Bar, BarChart, CHART_AXIS_PROPS, CHART_GRID_PROPS, CalendarRange, CartesianGrid, Cell, ChartTooltip, Container, DataTable, FLOW_COLORS, Gauge, JitStatusBadge, Legend, Line, LineChart, MapPinned, MetricCard, Pie, PieChart, ResponsiveContainer, SectionCard, Ship, Tooltip, XAxis, YAxis, avgCompletedOperationHours, avgCompletedProductivity, avgCompletedQuayHours, collapsedSections, completedCalls, completedLoaStats, completedShippingPie, completedShippingStats, dashboardData, flowMix, formatChartExportLabel, formatDateLabel, formatDateTimeCompact, formatHours, formatInteger, formatPercent, formatRowDate, formatShortDate, isJustInTime, isPngExporting, latestDaily, latestGate, loaCycleChartRows, loaProductivityMonthly, monthlyCycleRows, monthlyTrafficRows, operationsActivePredictions, portDestinations, portOrigins, renderExportPieValueLabel, selectedCumulYear, serviceRecap, shippingCycleChartRows, shippingProductivityMonthly, toNumber, toText, toggleSection }} fleetContext={{ Activity, ArrowRightLeft, Bar, BarChart, CHART_AXIS_PROPS, CHART_GRID_PROPS, CartesianGrid, Cell, ChartTooltip, Container, DataBadge, DataTable, Legend, Line, LineChart, MapPinned, MetricCard, Pie, PieChart, ResponsiveContainer, SectionCard, ShippingBadge, Tooltip, Truck, XAxis, YAxis, armateurEscalesPie, buildVisibleChartLabel, dashboardData, exploitantsBreakdown, formatDateLabel, formatInteger, formatShortDate, latestDaily, latestExploitants, latestGate, parkFamilyMix, portDestinations, portOrigins, selectedCumulYear, toNumber, yearScopedDailyData }} />
          <AnalyseView activeView={activeTab} correlationsContext={{ CHART_AXIS_PROPS, CHART_GRID_PROPS, CartesianGrid, CorrelationBadge, ResponsiveContainer, Scatter, ScatterChart, SectionCard, Tooltip, XAxis, YAxis, ZAxis, crossAnalyses, formatInteger, getCorrelationWarning, hasSufficientPearsonSample }} decisionContext={{ Bar, CHART_AXIS_PROPS, CHART_GRID_PROPS, CartesianGrid, ChartTooltip, CheckCircle2, CorrelationBadge, DataTable, INTELLIGENCE_THRESHOLDS, InsightCard, Legend, Line, LineChart, ResponsiveContainer, Scatter, ScatterChart, SectionCard, Tooltip, XAxis, YAxis, ZAxis, allInsights, buildVisibleChartLabel, collapsedSections, congestedCalls, congestionVsOccupationCorrelation, congestionVsOccupationRows, congestionWaitThreshold, dailyAnalysis, describeCorrelationStrength, formatDateLabel, formatHours, formatInteger, formatMinutes, formatPercent, getCorrelationWarning, hasSufficientPearsonSample, intelligenceCriteria, intelligenceGuideSections, quayVsProductivityCorrelation, quayVsProductivityRows, strongestCorrelations, toNumber, toggleSection, underperformingCalls, waitingVsCongestionCorrelation, waitingVsCongestionRows }} />

          {/* ═══════════════ TAB: OPERATIONS ═══════════════ */}

          {/* ═══════════════ TAB: BULLETIN ═══════════════ */}

          {/* ═══════════════ TAB: SEGMENTS ═══════════════ */}
          {activeTab === "segments" && <SourcesView ctx={{ Area, AreaChart, Bar, BarChart, CHART_AXIS_PROPS, CHART_GRID_PROPS, CalendarRange, CartesianGrid, ChartTooltip, Container, DataTable, Gauge, Legend, Line, LineChart, MetricCard, ResponsiveContainer, SEGMENT_ITEMS, SectionCard, Ship, ShippingBadge, Tooltip, XAxis, YAxis, activeSegment, buildVisibleChartLabel, dashboardData, formatDateLabel, formatInteger, formatMinutes, formatPercent, formatShortDate, gateTttTrend, latestKpi, latestParc, selectedCumulYear, setActiveSegment, toNumber, toText, yearScopedArmateursData, yearScopedDailyData, yearScopedExploitantsData, yearScopedGateData, yearScopedKpisData, yearScopedParcData, yearScopedRapportData }} />}

          {/* ═══════════════ TAB: NAVIRES ═══════════════ */}

          {/* ═══════════════ TAB: ANALYSE ═══════════════ */}

          {/* ═══════════════ TAB: CROISEE ═══════════════ */}

          {/* ═══════════════ TAB: INTELLIGENCE ═══════════════ */}

          {activeTab === "chat" && (
            <SectionCard
              id="chat-ia"
              title="Chat IA"
              subtitle="Session conversationnelle persistante, lecture metier et synthese exploitable"
              collapsed={collapsedSections["chat-ia"]}
              onToggle={toggleSection}
            >
              <ChatPanel context={chatContext} />
            </SectionCard>
          )}
          {activeTab === "quality" && <DataQualityView details={qualityDetails} />}
        </main>
      </div>
    </div>
  );
}
