"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  BarChart3,
  Brain,
  CalendarRange,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Container,
  Database,
  FileText,
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

const MENU_STORAGE_KEY = "port-pulse.open-groups";

/* ══════════════════════════════════════════════════════════════════
   ARBORESCENCE
   Cinq vues principales, chacune répondant à une question explicite,
   plus un tiroir pour les données sources — hors du flux de décision.
   Les identifiants techniques sont conservés : seule la présentation
   change, le rendu des vues reste inchangé.
   ══════════════════════════════════════════════════════════════════ */

const MAIN_TABS = [
  { id: "situation", label: "Pilotage", icon: CalendarRange },
  { id: "cumul2026", label: "Cumul annuel", icon: Activity },
  { id: "bulletin", label: "Bulletins mensuels", icon: CalendarRange },
  { id: "analyse", label: "Analyses KPIs", icon: BarChart3 },
  { id: "operations", label: "Escales & cycles", icon: Radar },
  { id: "navires", label: "Flotte & parc", icon: Ship },
  { id: "intelligence", label: "Aide à la décision", icon: Brain },
  { id: "croisee", label: "Corrélations", icon: GitCompareArrows },
  { id: "chat", label: "Assistant", icon: Brain },
  { id: "quality", label: "Qualité des données", icon: Database },
] as const;

export const SEGMENT_ITEMS = [
  { id: "global", label: "Vue source globale", icon: Radar },
  { id: "volumes", label: "Trafic & EVP", icon: Activity },
  { id: "gate", label: "Gate & camions", icon: Truck },
  { id: "escales", label: "Escales lignes", icon: Ship },
  { id: "exploitants", label: "Stock par ligne", icon: Container },
  { id: "kpis", label: "KPIs terminal", icon: Gauge },
  { id: "attendus", label: "Navires attendus", icon: Ship },
  { id: "appareilles", label: "Navires appareillés", icon: Ship },
  { id: "operation", label: "Navires en opération", icon: Ship },
  { id: "escalesOps", label: "Flux par escale", icon: Database },
  { id: "parc", label: "Capacité parc", icon: Container },
  { id: "rapport", label: "Rapports source", icon: CalendarRange },
] as const;

export type MainTabId = (typeof MAIN_TABS)[number]["id"] | "segments";
export type SegmentId = (typeof SEGMENT_ITEMS)[number]["id"];
export type MenuEntryId = MainTabId | `segment:${SegmentId}`;

/** Libellé unique par vue : menu, titre de page, export PDF et assistant. */
export const VIEW_LABELS: Record<string, string> = {
  situation: "Pilotage",
  cumul2026: "Cumul annuel",
  bulletin: "Bulletins mensuels",
  analyse: "Analyses KPIs",
  operations: "Escales & cycles",
  navires: "Flotte & parc",
  intelligence: "Aide à la décision",
  croisee: "Corrélations",
  chat: "Assistant",
  quality: "Qualité des données",
  segments: "Données sources",
};

interface NavGroup {
  key: string;
  label: string;
  question: string;
  icon: React.ComponentType<{ className?: string }>;
  tabs: MainTabId[];
  /** Tiroir : replié par défaut, hors du parcours de décision. */
  drawer?: boolean;
}

const NAV_GROUPS: NavGroup[] = [
  {
    key: "pilotage",
    label: "Pilotage",
    question: "Que se passe-t-il aujourd'hui, et dois-je agir ?",
    icon: CalendarRange,
    tabs: ["situation"],
  },
  {
    key: "performance",
    label: "Performance",
    question: "Tenons-nous nos objectifs sur la période ?",
    icon: Activity,
    tabs: ["cumul2026", "bulletin", "analyse"],
  },
  {
    key: "operations",
    label: "Opérations navires",
    question: "Comment se déroulent les escales ?",
    icon: Ship,
    tabs: ["operations", "navires"],
  },
  {
    key: "analyse",
    label: "Analyse",
    question: "Pourquoi ? Quels indicateurs sont liés ?",
    icon: Brain,
    tabs: ["intelligence", "croisee"],
  },
  {
    key: "assistant",
    label: "Assistant",
    question: "Pose ta question, en français.",
    icon: Brain,
    tabs: ["chat"],
  },
  {
    key: "sources",
    label: "Données & qualité",
    question: "Que contient précisément la donnée brute ?",
    icon: Database,
    tabs: ["quality", "segments"],
    drawer: true,
  },
];

/** Conservé pour compatibilité avec la configuration serveur. */
export const DEFAULT_VISIBLE_MENU_ITEMS: MenuEntryId[] = [
  ...MAIN_TABS.map((t) => t.id as MenuEntryId),
  ...SEGMENT_ITEMS.map((s) => `segment:${s.id}` as MenuEntryId),
];

/* ══════════════════════════════════════════════════════════════════ */

function buildTabHref(tab: MainTabId, segment?: SegmentId): string {
  const params = new URLSearchParams();
  params.set("tab", tab);
  if (tab === "segments") params.set("segment", segment ?? "global");
  return `/?${params.toString()}`;
}

function readOpenGroups(activeGroupKey: string): Record<string, boolean> {
  const fallback: Record<string, boolean> = { [activeGroupKey]: true };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(MENU_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return fallback;
    return { ...(parsed as Record<string, boolean>), [activeGroupKey]: true };
  } catch {
    return fallback;
  }
}

interface NavigationProps {
  activeTab: MainTabId;
  activeSegment: SegmentId;
  onTabChange: (tab: MainTabId) => void;
  onSegmentChange: (segment: SegmentId) => void;
  isLoading: boolean;
  latestDate: string;
  activeShipping: ShippingOption | null;
  logoUrl: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  visibleItems?: MenuEntryId[];
}

function NavLeaf({
  active,
  label,
  icon: Icon,
  href,
  onActivate,
  collapsed,
  nested,
}: {
  active: boolean;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  onActivate: () => void;
  collapsed: boolean;
  nested: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={(event) => {
        if (
          event.defaultPrevented ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0
        ) {
          return;
        }
        event.preventDefault();
        onActivate();
      }}
      aria-current={active ? "page" : undefined}
      title={collapsed ? label : undefined}
      className={`flex w-full items-center rounded-lg text-left text-[13px] transition-colors duration-150 ${
        collapsed ? "justify-center px-2 py-2" : `gap-2.5 py-2 ${nested ? "pl-9 pr-3" : "px-3"}`
      } ${
        active
          ? "bg-[var(--badge-bg)] font-semibold text-[var(--cyan)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
      }`}
    >
      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      {!collapsed ? <span className="truncate">{label}</span> : null}
    </Link>
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
  collapsed = false,
  onToggleCollapse,
}: NavigationProps) {
  const { theme, toggle } = useTheme();

  const activeGroupKey = useMemo(
    () => NAV_GROUPS.find((group) => group.tabs.includes(activeTab))?.key ?? "pilotage",
    [activeTab],
  );

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    readOpenGroups(activeGroupKey),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(openGroups));
  }, [openGroups]);

  const toggleGroup = (key: string) =>
    setOpenGroups((current) => ({ ...current, [key]: !current[key] }));

  /**
   * Le groupe contenant la vue active est toujours ouvert : l'utilisateur doit
   * voir où il se trouve. L'état est dérivé plutôt que synchronisé par un
   * effet, ce qui évite un rendu en cascade à chaque changement de vue.
   */
  const isGroupOpen = (key: string) => key === activeGroupKey || Boolean(openGroups[key]);

  return (
    <aside className={`hidden flex-shrink-0 flex-col lg:flex ${collapsed ? "w-[92px]" : "w-[268px]"}`}>
      <div className="sticky top-4 flex max-h-[calc(100vh-2rem)] flex-col rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-xl backdrop-blur-sm theme-transition">
        {/* ── En-tête ── */}
        <div className="border-b border-[var(--line)] p-5">
          <div className="flex items-center gap-3">
            <Image
              src={logoUrl}
              alt="Pakazure"
              width={144}
              height={122}
              className="h-10 w-10 rounded-lg border border-[var(--card-border)] object-cover"
            />
            {!collapsed ? (
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">Port Pulse</h1>
                <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Cockpit terminal
                </p>
              </div>
            ) : (
              <div className="flex-1" />
            )}
            {onToggleCollapse ? (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                title={collapsed ? "Afficher le menu" : "Masquer le menu"}
              >
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </button>
            ) : null}
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

        {/* ── Arborescence ── */}
        <nav className="flex-1 overflow-y-auto p-3">
          {NAV_GROUPS.map((group) => {
            const GroupIcon = group.icon;
            const isOpen = isGroupOpen(group.key);
            const isActiveGroup = group.key === activeGroupKey;
            const isSingle = group.tabs.length === 1 && group.tabs[0] !== "segments";

            // Groupe à vue unique : rendu directement, sans niveau superflu.
            if (isSingle) {
              const tabId = group.tabs[0];
              const tab = MAIN_TABS.find((t) => t.id === tabId);
              if (!tab) return null;
              return (
                <div key={group.key} className={group.drawer ? "mt-3 border-t border-[var(--line)] pt-3" : "mb-0.5"}>
                  <NavLeaf
                    active={activeTab === tabId}
                    label={group.label}
                    icon={GroupIcon}
                    href={buildTabHref(tabId)}
                    onActivate={() => onTabChange(tabId)}
                    collapsed={collapsed}
                    nested={false}
                  />
                </div>
              );
            }

            return (
              <div
                key={group.key}
                className={group.drawer ? "mt-3 border-t border-[var(--line)] pt-3" : "mb-0.5"}
              >
                <button
                  type="button"
                  onClick={() => toggleGroup(group.key)}
                  aria-expanded={isOpen}
                  title={collapsed ? group.label : group.question}
                  className={`flex w-full items-center rounded-lg text-left text-[13px] transition-colors duration-150 ${
                    collapsed ? "justify-center px-2 py-2" : "gap-2.5 px-3 py-2"
                  } ${
                    isActiveGroup
                      ? "font-semibold text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <GroupIcon className="h-3.5 w-3.5 flex-shrink-0" />
                  {!collapsed ? (
                    <>
                      <span className="flex-1 truncate">{group.label}</span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 flex-shrink-0 text-[var(--text-muted)] transition-transform duration-150 ${
                          isOpen ? "" : "-rotate-90"
                        }`}
                      />
                    </>
                  ) : null}
                </button>

                {isOpen && !collapsed ? (
                  <div className="mt-0.5 space-y-0.5">
                    {group.tabs.includes("segments")
                      ? SEGMENT_ITEMS.map((segment) => (
                          <NavLeaf
                            key={segment.id}
                            active={activeTab === "segments" && activeSegment === segment.id}
                            label={segment.label}
                            icon={segment.icon}
                            href={buildTabHref("segments", segment.id)}
                            onActivate={() => {
                              onTabChange("segments");
                              onSegmentChange(segment.id);
                            }}
                            collapsed={false}
                            nested
                          />
                        ))
                      : group.tabs.map((tabId) => {
                          const tab = MAIN_TABS.find((t) => t.id === tabId);
                          if (!tab) return null;
                          return (
                            <NavLeaf
                              key={tab.id}
                              active={activeTab === tab.id}
                              label={tab.label}
                              icon={tab.icon}
                              href={buildTabHref(tab.id)}
                              onActivate={() => onTabChange(tab.id)}
                              collapsed={false}
                              nested
                            />
                          );
                        })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        {/* ── Pied ── */}
        <div className="border-t border-[var(--line)] p-4">
          <Link
            href="/rapports"
            title="Demander un rapport"
            className={`mb-3 inline-flex items-center rounded-lg border border-[var(--cyan)]/30 bg-[var(--badge-bg)] text-[var(--cyan)] transition hover:brightness-110 ${
              collapsed ? "justify-center p-2" : "gap-2 px-3 py-2 text-[12px] font-medium"
            }`}
          >
            <FileText className="h-4 w-4" />
            {!collapsed ? <span>Rapport IA</span> : null}
          </Link>

          <div className={`flex items-center ${collapsed ? "justify-center" : "gap-2.5"}`}>
            <div
              className={`h-2 w-2 rounded-full ${
                isLoading ? "animate-pulse bg-[var(--warning)]" : "bg-[var(--success)]"
              }`}
            />
            {!collapsed ? (
              <p className="text-[12px] text-[var(--text-secondary)]">
                {isLoading ? "Actualisation…" : "Opérationnel"}
              </p>
            ) : null}
          </div>

          {!collapsed ? (
            <p className="mt-2 text-[11px] text-[var(--text-muted)]">Dernier bulletin : {latestDate}</p>
          ) : null}

          {!collapsed && activeShipping ? (
            <div className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--surface-hover)] p-2.5">
              <p className="mb-1.5 text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Filtre armateur
              </p>
              <ShippingBadge rawValue={activeShipping.label} />
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
