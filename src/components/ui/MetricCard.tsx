"use client";

import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string;
  tone: string;
  hint?: string;
  icon: React.ReactNode;
  compact?: boolean;
  delta?: number | null;
  deltaLabel?: string;
  sparkData?: number[];
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const h = 32;
  const w = 80;
  const step = w / (data.length - 1);

  const points = data
    .map((v, i) => `${i * step},${h - ((v - min) / range) * (h - 4) - 2}`)
    .join(" ");

  return (
    <svg width={w} height={h} className="opacity-60">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DeltaBadge({ delta, label }: { delta: number; label?: string }) {
  const isPositive = delta > 0;
  const isZero = delta === 0;

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        isZero
          ? "bg-slate-500/15 text-slate-400"
          : isPositive
            ? "bg-emerald-500/15 text-emerald-400"
            : "bg-red-500/15 text-red-400"
      }`}
    >
      {isZero ? (
        <Minus className="h-3 w-3" />
      ) : isPositive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      <span>
        {isPositive ? "+" : ""}
        {delta.toLocaleString("fr-FR")}
        {label ? ` ${label}` : ""}
      </span>
    </div>
  );
}

export default function MetricCard({
  label,
  value,
  tone,
  hint,
  icon,
  compact = false,
  delta,
  sparkData,
}: MetricCardProps) {
  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-[var(--card-border)] p-5 transition-all duration-300 hover:shadow-lg theme-transition"
      style={{
        background: `linear-gradient(135deg, ${tone}14 0%, var(--card-bg) 70%)`,
      }}
    >
      {/* Subtle glow on hover */}
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
        style={{ backgroundColor: `${tone}20` }}
      />

      <div className="relative">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
            {label}
          </span>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-primary)]"
            style={{ backgroundColor: `${tone}18`, border: `1px solid ${tone}25` }}
          >
            {icon}
          </div>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div
              className={`font-mono font-bold tracking-tight text-[var(--text-primary)] ${
                compact ? "text-xl lg:text-2xl" : "text-2xl lg:text-3xl"
              }`}
            >
              {value}
            </div>
            {delta != null && (
              <div className="mt-2">
                <DeltaBadge delta={delta} />
              </div>
            )}
            {hint && !compact ? (
              <p className="mt-2 text-[13px] leading-5 text-[var(--text-secondary)]">{hint}</p>
            ) : null}
          </div>
          {sparkData && sparkData.length > 1 && (
            <MiniSparkline data={sparkData} color={tone} />
          )}
        </div>
      </div>
    </div>
  );
}
