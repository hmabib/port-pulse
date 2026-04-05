"use client";

import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Eye, EyeOff, ImageDown, MoreHorizontal } from "lucide-react";
import { downloadElementAsPng } from "@/lib/exports";

interface SectionCardProps {
  id?: string;
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  emphasized?: boolean;
  collapsed?: boolean;
  onToggle?: (id: string) => void;
  actions?: React.ReactNode;
  exportMetadata?: string[];
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
  exportMetadata = [],
}: SectionCardProps) {
  const resolvedId = useMemo(() => id || `section-${slugify(title)}`, [id, title]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [localCollapsed, setLocalCollapsed] = useState(false);
  const effectiveCollapsed = onToggle ? collapsed : localCollapsed;
  const exportLines = useMemo(
    () => [
      `Section: ${title}`,
      ...(typeof subtitle === "string" && subtitle ? [`Sous-titre: ${subtitle}`] : []),
      ...exportMetadata,
      `Exporte le: ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date())}`,
    ],
    [exportMetadata, subtitle, title],
  );

  if (hidden) {
    return (
      <section className="min-w-0 rounded-2xl border border-dashed border-[var(--card-border)] bg-[var(--card-bg)] p-4 theme-transition">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
            <p className="mt-1 text-[12px] text-[var(--text-muted)]">Section masquee</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setHidden(false)}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--card-border)] bg-[var(--surface-hover)] px-3 py-1.5 text-[12px] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            >
              <Eye className="h-3.5 w-3.5" />
              Afficher
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id={resolvedId}
      className={`min-w-0 rounded-2xl border p-5 transition-colors duration-200 theme-transition ${
        emphasized
          ? "border-[var(--cyan)]/20 bg-[var(--card-bg)] shadow-[0_0_40px_rgba(56,189,248,0.04)]"
          : "border-[var(--card-border)] bg-[var(--card-bg)]"
      }`}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div
          className={onToggle ? "cursor-pointer select-none" : undefined}
          onClick={onToggle ? () => onToggle(resolvedId) : undefined}
        >
          <div className="flex items-center gap-2">
            {(onToggle || true) && (
              <span className="text-[var(--text-muted)]">
                {effectiveCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </span>
            )}
            <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
          </div>
          {subtitle && !effectiveCollapsed ? (
            <p className="mt-1 text-[13px] leading-5 text-[var(--text-muted)]">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {actions && !effectiveCollapsed ? <div className="flex items-center gap-2">{actions}</div> : null}
          <div className="relative" data-export-ignore="true">
            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--card-border)] bg-[var(--surface-hover)] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
              title="Actions section"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 top-11 z-20 min-w-[180px] rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-2 shadow-2xl">
                <button
                  type="button"
                  onClick={() => {
                    if (onToggle) onToggle(resolvedId);
                    else setLocalCollapsed((value) => !value);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                >
                  {effectiveCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  {effectiveCollapsed ? "Deplier" : "Plier"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHidden(true);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                >
                  <EyeOff className="h-4 w-4" />
                  Masquer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void downloadElementAsPng(resolvedId, `${resolvedId}.png`, exportLines);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                >
                  <ImageDown className="h-4 w-4" />
                  Export PNG
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {!effectiveCollapsed ? children : null}
    </section>
  );
}
