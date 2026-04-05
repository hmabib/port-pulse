"use client";

import React, { useMemo } from "react";
import { Activity, BarChart3, Hash, PieChartIcon, Sigma, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import MetricCard from "@/components/ui/MetricCard";
import ChartTooltip, { CHART_AXIS_PROPS, CHART_GRID_PROPS } from "@/components/ui/ChartTooltip";

type GenericRow = Record<string, unknown>;

type Kpi = {
  label: string;
  value: string;
  hint?: string;
  tone: string;
  icon: React.ReactNode;
};

type ListItem = {
  label: string;
  value: string;
  hint?: string;
};

type ChartKind = "bar" | "line" | "pie" | "histogram";

type ChartModel = {
  kind: ChartKind;
  labelKey: string;
  valueFormatter?: (value: number, name?: string) => string;
  seriesKeys: string[];
  data: Array<Record<string, string | number>>;
};

type InsightModel = {
  kpis: Kpi[];
  chart: ChartModel | null;
  topList: ListItem[];
};

const TONES = ["#06b6d4", "#10b981", "#8b5cf6", "#f59e0b", "#f97316", "#3b82f6"];

function buildChartLabel(value: unknown): string {
  const numeric = toNumber(value);
  if (numeric == null || numeric === 0) return "";
  if (Math.abs(numeric) >= 1000) return numeric.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
  if (Number.isInteger(numeric)) return String(numeric);
  return numeric.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}

function isTechnicalKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return (
    normalized === "id" ||
    normalized.endsWith("_id") ||
    normalized === "rapport_id" ||
    normalized === "date_id" ||
    normalized === "created_at" ||
    normalized === "updated_at"
  );
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const normalized = value.replace(/\s/g, "").replace(",", ".");
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function prettifyKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\bteu\b/gi, "TEU")
    .replace(/\bevp\b/gi, "EVP")
    .replace(/\bkpi\b/gi, "KPI")
    .replace(/\bttt\b/gi, "TTT")
    .replace(/\bmvts\b/gi, "mvt")
    .replace(/\b([a-z])/g, (match) => match.toUpperCase());
}

function detectUnit(key: string): string {
  const normalized = key.toLowerCase();
  if (normalized.includes("productiv")) return "mvt/h";
  if (normalized.includes("pct") || normalized.includes("taux") || normalized.includes("ratio")) return "%";
  if (normalized.includes("teu") || normalized.includes("evp")) return "TEU";
  if (normalized.includes("minute") || normalized.includes("ttt") || normalized.includes("duree")) return "min";
  if (normalized.includes("camion")) return "camions";
  if (normalized.includes("mouvement")) return "mouvements";
  if (normalized.includes("navire")) return "navires";
  if (normalized.includes("escale")) return "escales";
  return "";
}

function formatMetricValue(value: number, unit?: string): string {
  let formatted = "";
  if (unit === "%") {
    formatted = value.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
    return `${formatted} %`;
  }

  if (Math.abs(value) >= 1000) formatted = value.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
  else if (Math.abs(value) >= 100) formatted = value.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
  else if (Math.abs(value) >= 10) formatted = value.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
  else formatted = value.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

  return unit ? `${formatted} ${unit}` : formatted;
}

function formatDateLabel(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.slice(0, 20);
  return parsed.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function normalizeLabelValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value) || /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return formatDateLabel(value);
    }
    return value.length > 28 ? `${value.slice(0, 25)}...` : value;
  }
  if (value instanceof Date) return formatDateLabel(value.toISOString());
  return String(value);
}

function isDateSeries(values: string[]): boolean {
  const hits = values.filter((value) => /^\d{2}\s\w+\s\d{4}$/.test(value) || /^\d{4}-\d{2}-\d{2}/.test(value));
  return hits.length >= Math.max(1, Math.ceil(values.length * 0.5));
}

function inferNumericKeys(rows: GenericRow[]): string[] {
  const keys = Object.keys(rows[0] ?? {});
  return keys.filter((key) => {
    if (isTechnicalKey(key)) return false;
    const numericCount = rows.reduce((count, row) => count + (toNumber(row[key]) != null ? 1 : 0), 0);
    return numericCount >= Math.max(1, Math.ceil(rows.length * 0.6));
  });
}

function inferLabelKey(rows: GenericRow[], numericKeys: string[]): string | null {
  const keys = Object.keys(rows[0] ?? {}).filter((key) => !numericKeys.includes(key) && !isTechnicalKey(key));
  if (!keys.length) return null;

  const priorities = [
    "date_rapport",
    "date",
    "jour",
    "mois",
    "month",
    "nom_navire",
    "nom",
    "shipping",
    "service",
    "poste",
    "label",
  ];

  for (const candidate of priorities) {
    const match = keys.find((key) => key.toLowerCase() === candidate);
    if (match) return match;
  }

  return keys[0] ?? null;
}

function dedupeRowsByLabel(rows: GenericRow[], labelKey: string | null): GenericRow[] {
  if (!labelKey) return rows;
  const map = new Map<string, GenericRow>();
  for (const row of rows) {
    map.set(normalizeLabelValue(row[labelKey]), row);
  }
  return Array.from(map.values());
}

function choosePreferredNumericKeys(numericKeys: string[], limit: number, rows: GenericRow[]): string[] {
  const allZero = (key: string) =>
    rows.every((row) => {
      const value = toNumber(row[key]);
      return value == null || value === 0;
    });

  const scored = numericKeys.map((key) => {
    const normalized = key.toLowerCase();
    let score = 0;
    if (/total_realise|total_prevue|total_prevue|total_teu|total_forecast/.test(normalized)) score += 120;
    if (/realise|realisee|reception|observe/.test(normalized)) score += 70;
    if (/prevue|prevues|forecast|budget/.test(normalized)) score += 60;
    if (/taux_realisation|pct|ratio/.test(normalized)) score += 55;
    if (/productiv|occupation|ttt/.test(normalized)) score += 50;
    if (/cma|msc|maersk|hapag|autres/.test(normalized)) score -= 15;
    if (/^total$/.test(normalized)) score += 50;
    if (allZero(key)) score -= 100;
    return { key, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.key)
    .slice(0, limit);
}

function isSnapshotSeries(rows: GenericRow[], labelKey: string | null, numericKeys: string[]): boolean {
  if (!labelKey || rows.length < 2) return false;
  const normalizedLabel = labelKey.toLowerCase();
  const hasDateLabel = normalizedLabel.includes("date");
  if (!hasDateLabel) return false;

  const repeatedLabels = new Set<string>();
  const seen = new Set<string>();
  for (const row of rows) {
    const label = normalizeLabelValue(row[labelKey]);
    if (seen.has(label)) repeatedLabels.add(label);
    seen.add(label);
  }

  const totalLikeKeys = numericKeys.filter((key) =>
    /total|prevue|prevues|realise|realisees|forecast|budget|taux/i.test(key),
  );

  return repeatedLabels.size > 0 || totalLikeKeys.length >= 2;
}

function buildSnapshotKpis(rows: GenericRow[], labelKey: string, numericKeys: string[]): Kpi[] {
  const distinctRows = dedupeRowsByLabel(rows, labelKey);
  const latest = distinctRows[0] ?? rows[0];
  const oldest = distinctRows[distinctRows.length - 1] ?? latest;
  const picked = choosePreferredNumericKeys(numericKeys, 3, distinctRows);

  const cards: Kpi[] = [
    {
      label: "Jours affiches",
      value: distinctRows.length.toLocaleString("fr-FR"),
      hint: "Nombre de dates distinctes dans la reponse",
      tone: "#06b6d4",
      icon: <Hash className="h-4 w-4" />,
    },
  ];

  for (const [index, key] of picked.entries()) {
    const latestValue = toNumber(latest[key]) ?? 0;
    const previousValue = toNumber(oldest[key]) ?? latestValue;
    const delta = latestValue - previousValue;
    const unit = detectUnit(key);

    cards.push({
      label: prettifyKey(key),
      value: formatMetricValue(latestValue, unit),
      hint:
        distinctRows.length > 1
          ? `Derniere valeur observee, evolution ${delta >= 0 ? "+" : ""}${formatMetricValue(delta, unit)} sur la periode visible`
          : "Derniere valeur observee",
      tone: TONES[(index + 1) % TONES.length] ?? "#10b981",
      icon: index === 0 ? <Sigma className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />,
    });
  }

  return cards.slice(0, 4);
}

function buildKpis(rows: GenericRow[], rowCount: number, numericKeys: string[]): Kpi[] {
  if (!rows.length) return [];

  if (rows.length === 1) {
    return numericKeys.slice(0, 4).map((key, index) => {
      const unit = detectUnit(key);
      return {
        label: prettifyKey(key),
        value: formatMetricValue(toNumber(rows[0][key]) ?? 0, unit),
        hint: unit ? `Unite: ${unit}` : "Valeur calculee sur la reponse",
        tone: TONES[index % TONES.length] ?? "#06b6d4",
        icon: index === 0 ? <Activity className="h-4 w-4" /> : index === 1 ? <Sigma className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />,
      };
    });
  }

  const firstSeries = numericKeys[0];
  const values = firstSeries ? rows.map((row) => toNumber(row[firstSeries])).filter((value): value is number => value != null) : [];
  const total = values.reduce((sum, value) => sum + value, 0);
  const average = values.length ? total / values.length : 0;
  const peak = values.length ? Math.max(...values) : 0;
  const displaySeries = firstSeries ? prettifyKey(firstSeries) : "";
  const unit = firstSeries ? detectUnit(firstSeries) : "";

  return [
    {
      label: "Resultats",
      value: rowCount.toLocaleString("fr-FR"),
      hint: "Nombre de lignes pertinentes retournees",
      tone: "#06b6d4",
      icon: <Hash className="h-4 w-4" />,
    },
    ...(firstSeries
      ? [
          {
            label: `Total ${displaySeries}`,
            value: formatMetricValue(total, unit),
            hint: "Somme sur les lignes visibles",
            tone: "#10b981",
            icon: <Sigma className="h-4 w-4" />,
          },
          {
            label: `Moyenne ${displaySeries}`,
            value: formatMetricValue(average, unit),
            hint: "Moyenne de l'echantillon visible",
            tone: "#8b5cf6",
            icon: <TrendingUp className="h-4 w-4" />,
          },
          {
            label: `Pic ${displaySeries}`,
            value: formatMetricValue(peak, unit),
            hint: "Valeur maximale observee",
            tone: "#f59e0b",
            icon: <BarChart3 className="h-4 w-4" />,
          },
        ]
      : []),
  ].slice(0, 4);
}

function buildHistogram(rows: GenericRow[], numericKey: string): ChartModel | null {
  const values = rows.map((row) => toNumber(row[numericKey])).filter((value): value is number => value != null);
  if (values.length < 5) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return null;

  const bucketCount = Math.min(6, Math.max(4, Math.round(Math.sqrt(values.length))));
  const step = (max - min) / bucketCount;
  const buckets = Array.from({ length: bucketCount }, (_, index) => ({
    bucket: `${formatMetricValue(min + index * step)} - ${formatMetricValue(min + (index + 1) * step)}`,
    effectif: 0,
  }));

  for (const value of values) {
    const idx = Math.min(bucketCount - 1, Math.floor((value - min) / step));
    buckets[idx].effectif += 1;
  }

  return {
    kind: "histogram",
    labelKey: "bucket",
    seriesKeys: ["effectif"],
    data: buckets,
  };
}

function buildChartModel(rows: GenericRow[], numericKeys: string[], labelKey: string | null): ChartModel | null {
  if (!rows.length || !numericKeys.length) return null;

  if (rows.length === 1 && numericKeys.length >= 2) {
    return {
      kind: "bar",
      labelKey: "metric",
      seriesKeys: ["value"],
      data: numericKeys.slice(0, 6).map((key) => ({
        metric: prettifyKey(key),
        value: toNumber(rows[0][key]) ?? 0,
      })),
    };
  }

  if (!labelKey && numericKeys.length === 1) {
    return buildHistogram(rows, numericKeys[0]);
  }

  if (!labelKey) return null;

  const baseRows = dedupeRowsByLabel(rows, labelKey);
  const preferredSeries = choosePreferredNumericKeys(numericKeys, 2, baseRows);
  const labelValuesRaw = baseRows.slice(0, 12).map((row) => normalizeLabelValue(row[labelKey]));
  const isDate = isDateSeries(labelValuesRaw);
  const singleSeries = preferredSeries.length === 1;
  const seriesKeys = isDate ? preferredSeries.slice(0, 2) : preferredSeries.slice(0, 1);
  const data = baseRows.slice(0, 12).map((row) => ({
    [labelKey]: normalizeLabelValue(row[labelKey]),
    ...Object.fromEntries(seriesKeys.map((key) => [key, toNumber(row[key]) ?? 0])),
  }));

  if (!isDate && singleSeries && data.length <= 8) {
    return {
      kind: "pie",
      labelKey,
      seriesKeys,
      data,
      valueFormatter: (value) => formatMetricValue(value, detectUnit(seriesKeys[0] ?? "")),
    };
  }

  return {
    kind: isDate ? "line" : "bar",
    labelKey,
    seriesKeys,
    data,
    valueFormatter: (value, name) => formatMetricValue(value, detectUnit(name ?? seriesKeys[0] ?? "")),
  };
}

function buildTopList(rows: GenericRow[], numericKeys: string[], labelKey: string | null): ListItem[] {
  if (!rows.length || !labelKey || !numericKeys.length) return [];
  const dedupedRows = dedupeRowsByLabel(rows, labelKey);
  const mainKey = choosePreferredNumericKeys(numericKeys, 1, dedupedRows)[0] ?? numericKeys[0];
  const unit = detectUnit(mainKey);

  return dedupedRows
    .map((row) => ({
      label: normalizeLabelValue(row[labelKey]),
      value: formatMetricValue(toNumber(row[mainKey]) ?? 0, unit),
      hint: `Lecture principale: ${prettifyKey(mainKey)}`,
    }));
}

export default function QueryInsights({
  rows,
  rowCount,
}: {
  rows: GenericRow[];
  rowCount: number;
}) {
  const model = useMemo<InsightModel | null>(() => {
    if (!rows.length) return null;
    const numericKeys = inferNumericKeys(rows);
    const labelKey = inferLabelKey(rows, numericKeys);
    const snapshotMode = isSnapshotSeries(rows, labelKey, numericKeys);
    return {
      kpis: snapshotMode && labelKey ? buildSnapshotKpis(rows, labelKey, numericKeys) : buildKpis(rows, rowCount, numericKeys),
      chart: buildChartModel(rows, numericKeys, labelKey),
      topList: buildTopList(rows, numericKeys, labelKey),
    };
  }, [rowCount, rows]);

  if (!model || (model.kpis.length === 0 && !model.chart && model.topList.length === 0)) return null;

  return (
    <div className="mt-3 space-y-3">
      {model.kpis.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {model.kpis.map((kpi) => (
            <MetricCard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              tone={kpi.tone}
              hint={kpi.hint}
              icon={kpi.icon}
              compact
            />
          ))}
        </div>
      )}

      <div className={`grid gap-3 ${model.chart && model.topList.length > 0 ? "xl:grid-cols-[1.2fr_0.8fr]" : ""}`}>
        {model.chart ? (
          (() => {
            const chart = model.chart;
            return (
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Visualisation rapide
                </p>
                <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
                  Type choisi automatiquement selon la structure des resultats
                </p>
              </div>
            </div>

            <div className="h-[260px] min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                {chart.kind === "line" ? (
                  <LineChart data={chart.data}>
                    <CartesianGrid {...CHART_GRID_PROPS} />
                    <XAxis dataKey={chart.labelKey} {...CHART_AXIS_PROPS} />
                    <YAxis {...CHART_AXIS_PROPS} />
                    <Tooltip content={<ChartTooltip valueFormatter={chart.valueFormatter} />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {chart.seriesKeys.map((key, index) => (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        name={prettifyKey(key)}
                        stroke={TONES[index % TONES.length] ?? "#06b6d4"}
                        strokeWidth={2.4}
                        dot={{ r: 2 }}
                      >
                        <LabelList dataKey={key} position="top" formatter={buildChartLabel} className="fill-slate-300 text-[10px]" />
                      </Line>
                    ))}
                  </LineChart>
                ) : chart.kind === "pie" ? (
                  <PieChart>
                    <Tooltip content={<ChartTooltip valueFormatter={chart.valueFormatter} />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Pie
                      data={chart.data}
                      dataKey={chart.seriesKeys[0]}
                      nameKey={chart.labelKey}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={86}
                      paddingAngle={2}
                      label={({ name, value, percent }) => {
                        const label = typeof name === "string" ? name : "";
                        const metric = buildChartLabel(value);
                        const ratio = typeof percent === "number" ? ` (${(percent * 100).toFixed(0)}%)` : "";
                        return `${label} ${metric}${ratio}`.trim();
                      }}
                    >
                      {chart.data.map((entry, index) => (
                        <Cell key={`${entry[chart.labelKey]}-${index}`} fill={TONES[index % TONES.length] ?? "#06b6d4"} />
                      ))}
                    </Pie>
                  </PieChart>
                ) : (
                  <BarChart data={chart.data}>
                    <CartesianGrid {...CHART_GRID_PROPS} />
                    <XAxis dataKey={chart.labelKey} {...CHART_AXIS_PROPS} />
                    <YAxis {...CHART_AXIS_PROPS} />
                    <Tooltip content={<ChartTooltip valueFormatter={chart.valueFormatter} />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {chart.seriesKeys.map((key, index) => (
                      <Bar
                        key={key}
                        dataKey={key}
                        name={chart.kind === "histogram" ? "Effectif" : prettifyKey(key)}
                        fill={TONES[index % TONES.length] ?? "#06b6d4"}
                        radius={[8, 8, 0, 0]}
                      >
                        <LabelList dataKey={key} position="top" formatter={buildChartLabel} className="fill-slate-300 text-[10px]" />
                      </Bar>
                    ))}
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
            );
          })()
        ) : null}

        {model.topList.length > 0 ? (
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
            <div className="mb-3 flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-[var(--cyan)]" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Lecture liste
                </p>
                <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
                  Les elements les plus parlants de la reponse
                </p>
              </div>
            </div>
            <div className="space-y-2.5">
              {model.topList.map((item) => (
                <div key={`${item.label}-${item.value}`} className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-hover)] px-3 py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[12px] font-medium text-[var(--text-primary)]">{item.label}</p>
                    <p className="font-mono text-[12px] font-semibold text-[var(--cyan)]">{item.value}</p>
                  </div>
                  {item.hint ? <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{item.hint}</p> : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
