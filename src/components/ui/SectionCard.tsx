"use client";

import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface SectionCardProps {
  id?: string;
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  emphasized?: boolean;
  collapsed?: boolean;
  onToggle?: (id: string) => void;
  actions?: React.ReactNode;
}

export default function SectionCard({
  id,
  title,
  subtitle,
  children,
  emphasized = false,
  collapsed = false,
  onToggle,
  actions,
}: SectionCardProps) {
  return (
    <section
      className={`min-w-0 rounded-2xl border p-5 transition-colors duration-200 theme-transition ${
        emphasized
          ? "border-[var(--cyan)]/20 bg-[var(--card-bg)] shadow-[0_0_40px_rgba(56,189,248,0.04)]"
          : "border-[var(--card-border)] bg-[var(--card-bg)]"
      }`}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div
          className={onToggle ? "cursor-pointer select-none" : undefined}
          onClick={onToggle && id ? () => onToggle(id) : undefined}
        >
          <div className="flex items-center gap-2">
            {onToggle && (
              <span className="text-[var(--text-muted)]">
                {collapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </span>
            )}
            <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
          </div>
          {subtitle && !collapsed ? (
            <p className="mt-1 text-[13px] leading-5 text-[var(--text-muted)]">{subtitle}</p>
          ) : null}
        </div>
        {actions && !collapsed ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
      {!collapsed ? children : null}
    </section>
  );
}
