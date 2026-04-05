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
    <div className="max-w-[260px] rounded-2xl border border-[var(--card-border)] bg-[var(--tooltip-bg)] px-4 py-3 shadow-[0_18px_50px_rgba(2,8,23,0.35)] backdrop-blur-md">
      <p className="mb-2 border-b border-[var(--line)] pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
        {formattedLabel}
      </p>
      <div className="space-y-1.5">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-start gap-2.5 text-sm">
            <span
              className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="min-w-0 flex-1 leading-5 text-[var(--text-secondary)]">{entry.name}</span>
            <span className="ml-auto flex-shrink-0 font-mono font-semibold text-[var(--text-primary)]">
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
