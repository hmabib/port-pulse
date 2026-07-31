"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  Bar,
  Brush,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpDown,
  ChartNoAxesCombined,
  CircleDot,
  RotateCcw,
  Table2,
  Tags,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { normalizeDateOnly } from "@/lib/data-quality";
import { CHART_AXIS_PROPS, CHART_GRID_PROPS } from "./ChartTooltip";

type Row = Record<string, unknown>;
type Period = "30d" | "90d" | "180d" | "year" | "all" | "custom";
type ChartMode = "line" | "area" | "bar" | "table";

export type ExplorerSeries = {
  key: string;
  label: string;
  color: string;
  axis?: "left" | "right";
  dashed?: boolean;
};

type TimeSeriesExplorerProps = {
  data: Row[];
  series: ExplorerSeries[];
  dateKey?: string;
  height?: number;
  defaultPeriod?: Period;
  valueFormatter?: (value: unknown, key: string) => string;
  dateFormatter?: (value: unknown) => string;
  domains?: {
    left?: [number | string, number | string];
    right?: [number | string, number | string];
  };
};

const PERIOD_OPTIONS: Array<{ value: Period; label: string }> = [
  { value: "30d", label: "30 jours" },
  { value: "90d", label: "90 jours" },
  { value: "180d", label: "6 mois" },
  { value: "year", label: "Année" },
  { value: "all", label: "Tout" },
  { value: "custom", label: "Personnalisé" },
];

function dateParts(value: unknown) {
  const normalized = normalizeDateOnly(value);
  const timestamp = Date.parse(`${normalized}T00:00:00Z`);
  return {
    normalized,
    timestamp: Number.isFinite(timestamp) ? timestamp : null,
  };
}

function inputClassName() {
  return "h-9 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-[12px] text-[var(--text-primary)] outline-none transition focus:border-[var(--pak-400)]";
}

function toolButtonClassName(active = false) {
  return `inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] transition ${
    active
      ? "border-[var(--pak-500)] bg-[var(--badge-bg)] text-[var(--text-primary)]"
      : "border-[var(--card-border)] bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
  }`;
}

export default function TimeSeriesExplorer({
  data,
  series,
  dateKey = "date_rapport",
  height = 340,
  defaultPeriod = "90d",
  valueFormatter = (value) =>
    typeof value === "number" ? value.toLocaleString("fr-FR") : String(value ?? "—"),
  dateFormatter = (value) => String(value ?? "—"),
  domains,
}: TimeSeriesExplorerProps) {
  const [period, setPeriod] = useState<Period>(defaultPeriod);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [mode, setMode] = useState<ChartMode>("line");
  const [visibleKeys, setVisibleKeys] = useState(() => new Set(series.map((item) => item.key)));
  const [showValues, setShowValues] = useState(false);
  const [showDots, setShowDots] = useState(false);
  const [reverseTable, setReverseTable] = useState(false);
  const [range, setRange] = useState({ startIndex: 0, endIndex: Math.max(0, data.length - 1) });

  const bounds = useMemo(() => {
    const timestamps = data
      .map((row) => dateParts(row[dateKey]).timestamp)
      .filter((value): value is number => value !== null);
    if (timestamps.length === 0) return { first: null, last: null };
    return { first: Math.min(...timestamps), last: Math.max(...timestamps) };
  }, [data, dateKey]);

  const periodData = useMemo(() => {
    if (bounds.last === null || period === "all") return data;

    let from = bounds.first;
    let to = bounds.last;
    if (period === "30d") from = bounds.last - 29 * 86_400_000;
    if (period === "90d") from = bounds.last - 89 * 86_400_000;
    if (period === "180d") from = bounds.last - 179 * 86_400_000;
    if (period === "year") {
      const latest = new Date(bounds.last);
      from = Date.UTC(latest.getUTCFullYear(), 0, 1);
    }
    if (period === "custom") {
      from = customStart ? Date.parse(`${customStart}T00:00:00Z`) : bounds.first;
      to = customEnd ? Date.parse(`${customEnd}T23:59:59Z`) : bounds.last;
    }

    return data.filter((row) => {
      const timestamp = dateParts(row[dateKey]).timestamp;
      return timestamp !== null && (from === null || timestamp >= from) && timestamp <= to;
    });
  }, [bounds.first, bounds.last, customEnd, customStart, data, dateKey, period]);

  useEffect(() => {
    setRange({ startIndex: 0, endIndex: Math.max(0, periodData.length - 1) });
  }, [periodData.length, period]);

  const activeSeries = series.filter((item) => visibleKeys.has(item.key));
  const visibleRows = periodData.slice(range.startIndex, range.endIndex + 1);
  const tableRows = reverseTable ? visibleRows.toReversed() : visibleRows;
  const dense = visibleRows.length > 24;
  const canShowLabels = showValues && visibleRows.length <= 40;

  function toggleSeries(key: string) {
    setVisibleKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function zoom(multiplier: number) {
    const total = periodData.length;
    if (total < 2) return;
    const width = range.endIndex - range.startIndex + 1;
    const nextWidth = Math.max(7, Math.min(total, Math.round(width * multiplier)));
    const center = Math.round((range.startIndex + range.endIndex) / 2);
    let startIndex = Math.max(0, center - Math.floor(nextWidth / 2));
    const endIndex = Math.min(total - 1, startIndex + nextWidth - 1);
    startIndex = Math.max(0, endIndex - nextWidth + 1);
    setRange({ startIndex, endIndex });
  }

  const renderSeries = (item: ExplorerSeries) => {
    const common = {
      key: item.key,
      dataKey: item.key,
      name: item.label,
      yAxisId: item.axis ?? "left",
      stroke: item.color,
      fill: item.color,
    };
    if (mode === "bar") {
      return <Bar {...common} fillOpacity={0.78} radius={[3, 3, 0, 0]} />;
    }
    if (mode === "area") {
      return (
        <Area
          {...common}
          type="monotone"
          connectNulls={false}
          fillOpacity={0.12}
          strokeWidth={2.25}
          strokeDasharray={item.dashed ? "6 3" : undefined}
          dot={showDots && !dense ? { r: 2.5 } : false}
          label={canShowLabels ? { fill: "var(--text-muted)", fontSize: 10 } : false}
        />
      );
    }
    return (
      <Line
        {...common}
        type="monotone"
        connectNulls={false}
        strokeWidth={2.25}
        strokeDasharray={item.dashed ? "6 3" : undefined}
        dot={showDots && !dense ? { r: 2.5 } : false}
        activeDot={{ r: 4 }}
        label={canShowLabels ? { fill: "var(--text-muted)", fontSize: 10 } : false}
      />
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2" data-export-ignore="true">
        <select
          aria-label="Période du graphique"
          value={period}
          onChange={(event) => setPeriod(event.target.value as Period)}
          className={inputClassName()}
        >
          {PERIOD_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {period === "custom" ? (
          <>
            <input
              aria-label="Date de début"
              type="date"
              value={customStart}
              onChange={(event) => setCustomStart(event.target.value)}
              className={inputClassName()}
            />
            <input
              aria-label="Date de fin"
              type="date"
              value={customEnd}
              onChange={(event) => setCustomEnd(event.target.value)}
              className={inputClassName()}
            />
          </>
        ) : null}

        <button type="button" onClick={() => zoom(0.5)} className={toolButtonClassName()} title="Zoom avant">
          <ZoomIn className="h-3.5 w-3.5" />
          Zoom
        </button>
        <button type="button" onClick={() => zoom(2)} className={toolButtonClassName()} title="Zoom arrière">
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setRange({ startIndex: 0, endIndex: Math.max(0, periodData.length - 1) })}
          className={toolButtonClassName()}
          title="Réinitialiser le zoom"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>

        <span className="mx-1 hidden h-6 w-px bg-[var(--line)] sm:block" />

        {(["line", "area", "bar", "table"] as ChartMode[]).map((chartMode) => (
          <button
            key={chartMode}
            type="button"
            onClick={() => setMode(chartMode)}
            className={toolButtonClassName(mode === chartMode)}
            title={chartMode === "table" ? "Afficher les données" : `Affichage ${chartMode}`}
          >
            {chartMode === "table" ? <Table2 className="h-3.5 w-3.5" /> : <ChartNoAxesCombined className="h-3.5 w-3.5" />}
            {chartMode === "line" ? "Courbes" : chartMode === "area" ? "Aires" : chartMode === "bar" ? "Barres" : "Données"}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {series.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => toggleSeries(item.key)}
              className={toolButtonClassName(visibleKeys.has(item.key))}
            >
              <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2" data-export-ignore="true">
          <button type="button" onClick={() => setShowDots((value) => !value)} className={toolButtonClassName(showDots)}>
            <CircleDot className="h-3.5 w-3.5" />
            Points
          </button>
          <button type="button" onClick={() => setShowValues((value) => !value)} className={toolButtonClassName(showValues)}>
            <Tags className="h-3.5 w-3.5" />
            Valeurs
          </button>
        </div>
      </div>

      <p className="text-[12px] text-[var(--text-muted)]">
        {visibleRows.length.toLocaleString("fr-FR")} point(s) affiché(s)
        {showValues && !canShowLabels ? " · zoomez à 40 points ou moins pour afficher les valeurs" : ""}
        {" · "}Astuce : faites glisser les poignées sous le graphique pour isoler une période.
      </p>

      {mode === "table" ? (
        <div className="max-h-[420px] overflow-auto rounded-xl border border-[var(--card-border)]">
          <table className="w-full min-w-[560px] border-collapse text-[12px]">
            <thead className="sticky top-0 bg-[var(--surface)] text-[var(--text-muted)]">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">
                  <button type="button" onClick={() => setReverseTable((value) => !value)} className="inline-flex items-center gap-1">
                    Date <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </th>
                {activeSeries.map((item) => (
                  <th key={item.key} className="px-3 py-2 text-right font-semibold">{item.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, index) => (
                <tr key={`${String(row[dateKey])}-${index}`} className="border-t border-[var(--line)] text-[var(--text-secondary)]">
                  <td className="px-3 py-2">{dateFormatter(row[dateKey])}</td>
                  {activeSeries.map((item) => (
                    <td key={item.key} className="px-3 py-2 text-right font-mono text-[var(--text-primary)]">
                      {valueFormatter(row[item.key], item.key)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="min-w-0" style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={periodData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid {...CHART_GRID_PROPS} />
              <XAxis
                dataKey={dateKey}
                {...CHART_AXIS_PROPS}
                tickFormatter={dateFormatter}
                minTickGap={48}
                interval="preserveStartEnd"
              />
              <YAxis yAxisId="left" {...CHART_AXIS_PROPS} domain={domains?.left} width={54} />
              {series.some((item) => item.axis === "right") ? (
                <YAxis yAxisId="right" orientation="right" {...CHART_AXIS_PROPS} domain={domains?.right} width={54} />
              ) : null}
              <Tooltip
                labelFormatter={dateFormatter}
                formatter={(value, name, item) => [
                  valueFormatter(value, String(item.dataKey ?? "")),
                  name,
                ]}
                contentStyle={{
                  background: "var(--tooltip-bg)",
                  border: "1px solid var(--tooltip-border)",
                  borderRadius: 12,
                  color: "var(--text-primary)",
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {activeSeries.map(renderSeries)}
              <Brush
                dataKey={dateKey}
                height={26}
                travellerWidth={10}
                stroke="var(--pak-500)"
                fill="var(--surface-muted)"
                startIndex={range.startIndex}
                endIndex={range.endIndex}
                tickFormatter={dateFormatter}
                onChange={(next) => {
                  if (typeof next.startIndex === "number" && typeof next.endIndex === "number") {
                    setRange({ startIndex: next.startIndex, endIndex: next.endIndex });
                  }
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
