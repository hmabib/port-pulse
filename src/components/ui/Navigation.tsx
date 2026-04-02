"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Activity,
  BarChart3,
  Brain,
  CalendarRange,
  ChevronDown,
  Container,
  Database,
  Gauge,
  GitCompareArrows,
  Moon,
  Radar,
  Ship,
  Sun,
  Truck,
} from "lucide-react";
import type { ShippingOption } from "@/lib/shipping";
import { useTheme } from "@/lib/theme";
import ShippingBadge from "./ShippingBadge";

const MAIN_TABS = [
  { id: "situation", label: "Situation du jour", icon: CalendarRange },
  { id: "cumul2026", label: "Cumul 2026", icon: Activity },
  { id: "operations", label: "Synthese", icon: Radar },
  { id: "bulletin", label: "Bulletin", icon: CalendarRange },
  { id: "navires", label: "Navires & Parc", icon: Ship },
  { id: "analyse", label: "Analyse", icon: BarChart3 },
  { id: "croisee", label: "Analyse croisee", icon: GitCompareArrows },
  { id: "intelligence", label: "Intelligence", icon: Brain },
] as const;

export const SEGMENT_ITEMS = [
  { id: "global", label: "Vue globale", icon: Radar },
  { id: "volumes", label: "Volumes TEU", icon: Activity },
  { id: "gate", label: "Gate / TTT", icon: Truck },
  { id: "escales", label: "Escales armateurs", icon: Ship },
  { id: "exploitants", label: "Exploitants parc", icon: Container },
  { id: "kpis", label: "KPIs", icon: Gauge },
  { id: "attendus", label: "Navires attendus", icon: Ship },
  { id: "appareilles", label: "Appareilles", icon: Ship },
  { id: "operation", label: "En operation", icon: Ship },
  { id: "escalesOps", label: "Ops escales", icon: Database },
  { id: "parc", label: "Parc conteneurs", icon: Container },
  { id: "rapport", label: "Rapport quotidien", icon: CalendarRange },
] as const;

export type MainTabId = (typeof MAIN_TABS)[number]["id"] | "segments";
export type SegmentId = (typeof SEGMENT_ITEMS)[number]["id"];

interface NavigationProps {
  activeTab: MainTabId;
  activeSegment: SegmentId;
  onTabChange: (tab: MainTabId) => void;
  onSegmentChange: (segment: SegmentId) => void;
  isLoading: boolean;
  latestDate: string;
  activeShipping: ShippingOption | null;
  logoUrl: string;
}

function NavItem({
  active,
  label,
  icon: Icon,
  onClick,
  indent = false,
}: {
  active: boolean;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  indent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition-all duration-150 ${
        indent ? "pl-8" : ""
      } ${
        active
          ? "bg-[var(--badge-bg)] font-medium text-[var(--cyan)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
      }`}
    >
      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}

export default function Navigation({
  activeTab,
  activeSegment,
  onTabChange,
  onSegmentChange,
  isLoading,
  latestDate,
  activeShipping,
  logoUrl,
}: NavigationProps) {
  const [segmentsOpen, setSegmentsOpen] = useState(activeTab === "segments");
  const { theme, toggle } = useTheme();

  return (
    <aside className="hidden w-[260px] flex-shrink-0 flex-col lg:flex">
      <div className="sticky top-4 flex max-h-[calc(100vh-2rem)] flex-col rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-xl backdrop-blur-sm theme-transition">
        {/* Header */}
        <div className="border-b border-[var(--line)] p-5">
          <div className="flex items-center gap-3">
            <Image
              src={logoUrl}
              alt="Pakazure"
              width={144}
              height={122}
              className="h-10 w-10 rounded-lg border border-[var(--card-border)] object-cover"
            />
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">Port Pulse</h1>
              <p className="text-[11px] uppercase tracking-widest text-[var(--text-muted)]">
                Terminal Control
              </p>
            </div>
            {/* Theme toggle */}
            <button
              type="button"
              onClick={toggle}
              className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
              title={theme === "dark" ? "Mode clair" : "Mode sombre"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          <div className="space-y-0.5">
            {MAIN_TABS.map((tab) => (
              <NavItem
                key={tab.id}
                active={activeTab === tab.id}
                label={tab.label}
                icon={tab.icon}
                onClick={() => onTabChange(tab.id)}
              />
            ))}

            {/* Segments group */}
            <button
              type="button"
              onClick={() => {
                setSegmentsOpen((v) => !v);
                if (!segmentsOpen) onTabChange("segments");
              }}
              className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition-all duration-150 ${
                activeTab === "segments"
                  ? "bg-[var(--badge-bg)] font-medium text-[var(--cyan)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Database className="h-3.5 w-3.5" />
                <span>Segments</span>
              </div>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  segmentsOpen ? "rotate-0" : "-rotate-90"
                }`}
              />
            </button>

            {segmentsOpen && (
              <div className="ml-1 space-y-0.5 border-l border-[var(--line)] py-1">
                {SEGMENT_ITEMS.map((item) => (
                  <NavItem
                    key={item.id}
                    active={activeTab === "segments" && activeSegment === item.id}
                    label={item.label}
                    icon={item.icon}
                    onClick={() => {
                      onTabChange("segments");
                      onSegmentChange(item.id);
                    }}
                    indent
                  />
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Footer status */}
        <div className="border-t border-[var(--line)] p-4">
          <div className="flex items-center gap-2.5">
            <div
              className={`h-2 w-2 rounded-full ${isLoading ? "animate-pulse bg-amber-400" : "bg-emerald-400"}`}
            />
            <p className="text-[12px] text-[var(--text-secondary)]">
              {isLoading ? "Actualisation..." : "Operationnel"}
            </p>
          </div>
          <p className="mt-2 text-[11px] text-[var(--text-muted)]">
            Dernier point : {latestDate}
          </p>
          {activeShipping && (
            <div className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--surface-hover)] p-2.5">
              <p className="mb-1.5 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                Filtre armateur
              </p>
              <ShippingBadge rawValue={activeShipping.label} />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
