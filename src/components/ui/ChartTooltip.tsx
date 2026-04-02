"use client";

import React from "react";

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  labelFormatter?: (label: string) => string;
  valueFormatter?: (value: number, name?: string) => string;
}

export default function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const formattedLabel = labelFormatter ? labelFormatter(String(label ?? "")) : String(label ?? "");
  const formatValue = valueFormatter ?? ((v: number) => v.toLocaleString("fr-FR"));

  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--tooltip-bg)] px-4 py-3 shadow-2xl backdrop-blur-md">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
        {formattedLabel}
      </p>
      <div className="space-y-1.5">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2.5 text-sm">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-[var(--text-secondary)]">{entry.name}</span>
            <span className="ml-auto font-mono font-medium text-[var(--text-primary)]">
              {formatValue(entry.value, entry.name)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const CHART_GRID_PROPS = {
  stroke: "#1e293b",
  strokeDasharray: "3 3",
  opacity: 0.5,
} as const;

export const CHART_AXIS_PROPS = {
  stroke: "#475569",
  tick: { fill: "#64748b", fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;
