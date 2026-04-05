"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Activity,
  BarChart3,
  Brain,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Container,
  Database,
  FileText,
  Gauge,
  GitCompareArrows,
  Moon,
  RotateCcw,
  Radar,
  Settings2,
  Ship,
  Sun,
  Truck,
  X,
} from "lucide-react";
import type { ShippingOption } from "@/lib/shipping";
import { useTheme } from "@/lib/theme";
import ShippingBadge from "./ShippingBadge";

const MENU_STORAGE_KEY = "port-pulse.visible-menu-items";
const REQUIRED_MENU_ITEMS: MenuEntryId[] = ["chat"];

const MAIN_TABS = [
  { id: "situation", label: "Pilotage du jour", icon: CalendarRange },
  { id: "cumul2026", label: "Cumul annuel", icon: Activity },
  { id: "operations", label: "Operations navires", icon: Radar },
  { id: "bulletin", label: "Bulletins mensuels", icon: CalendarRange },
  { id: "navires", label: "Flotte & parc", icon: Ship },
  { id: "analyse", label: "Analyses KPIs", icon: BarChart3 },
  { id: "croisee", label: "Correlations", icon: GitCompareArrows },
  { id: "intelligence", label: "Aide a la decision", icon: Brain },
  { id: "chat", label: "Chat IA", icon: Brain },
] as const;

export const SEGMENT_ITEMS = [
  { id: "global", label: "Vue source globale", icon: Radar },
  { id: "volumes", label: "Trafic & EVP", icon: Activity },
  { id: "gate", label: "Gate & camions", icon: Truck },
  { id: "escales", label: "Escales lignes", icon: Ship },
  { id: "exploitants", label: "Stock par ligne", icon: Container },
  { id: "kpis", label: "KPIs terminal", icon: Gauge },
  { id: "attendus", label: "Navires attendus", icon: Ship },
  { id: "appareilles", label: "Navires appareilles", icon: Ship },
  { id: "operation", label: "Navires en operation", icon: Ship },
  { id: "escalesOps", label: "Flux par escale", icon: Database },
  { id: "parc", label: "Capacite parc", icon: Container },
  { id: "rapport", label: "Rapports source", icon: CalendarRange },
] as const;

export type MainTabId = (typeof MAIN_TABS)[number]["id"] | "segments";
export type SegmentId = (typeof SEGMENT_ITEMS)[number]["id"];
export type MenuEntryId =
  | MainTabId
  | `segment:${SegmentId}`;

export const DEFAULT_VISIBLE_MENU_ITEMS: MenuEntryId[] = [
  "situation",
  "cumul2026",
  "operations",
  "bulletin",
  "navires",
  "analyse",
  "croisee",
  "intelligence",
  "chat",
  "segment:global",
  "segment:volumes",
  "segment:gate",
  "segment:escales",
  "segment:exploitants",
  "segment:kpis",
  "segment:attendus",
  "segment:appareilles",
  "segment:operation",
  "segment:escalesOps",
  "segment:parc",
  "segment:rapport",
] as const;

const MENU_GROUPS = [
  {
    label: "Vues principales",
    items: MAIN_TABS.map((item) => ({
      id: item.id as MenuEntryId,
      label: item.label,
    })),
  },
  {
    label: "Vues detaillees",
    items: SEGMENT_ITEMS.map((item) => ({
      id: `segment:${item.id}` as MenuEntryId,
      label: item.label,
    })),
  },
] as const;

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

function buildTabHref(tab: MainTabId, segment?: SegmentId): string {
  const params = new URLSearchParams();
  params.set("tab", tab);
  if (tab === "segments") {
    params.set("segment", segment ?? "global");
  }
  return `/?${params.toString()}`;
}

function NavItem({
  active,
  label,
  icon: Icon,
  href,
  onActivate,
  collapsed = false,
}: {
  active: boolean;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  onActivate: () => void;
  collapsed?: boolean;
}) {
  return (
    <a
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
      className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-[13px] transition-all duration-150 ${
        collapsed ? "justify-center px-2" : "gap-2.5"
      } ${
        active
          ? "bg-[var(--badge-bg)] font-medium text-[var(--cyan)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
      }`}
      title={collapsed ? label : undefined}
    >
      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      {!collapsed ? <span className="truncate">{label}</span> : null}
    </a>
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
  visibleItems = DEFAULT_VISIBLE_MENU_ITEMS,
}: NavigationProps) {
  const { theme, toggle } = useTheme();
  const [menuSettingsOpen, setMenuSettingsOpen] = useState(false);
  const [effectiveVisibleItems, setEffectiveVisibleItems] = useState<MenuEntryId[]>(visibleItems);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(MENU_STORAGE_KEY);
      if (!raw) {
        setEffectiveVisibleItems(visibleItems);
        return;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        setEffectiveVisibleItems(visibleItems);
        return;
      }
      const allowed = new Set<MenuEntryId>(visibleItems);
      const next = parsed.filter((item): item is MenuEntryId => typeof item === "string" && allowed.has(item as MenuEntryId));
      const merged = next.length > 0 ? next : visibleItems;
      const withRequired = [...merged];
      for (const item of REQUIRED_MENU_ITEMS) {
        if (allowed.has(item) && !withRequired.includes(item)) {
          withRequired.push(item);
        }
      }
      setEffectiveVisibleItems(withRequired);
    } catch {
      setEffectiveVisibleItems(visibleItems);
    }
  }, [visibleItems]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(effectiveVisibleItems));
  }, [effectiveVisibleItems]);

  const visibleSet = new Set<MenuEntryId>(effectiveVisibleItems);
  const canHideItem = effectiveVisibleItems.length > 1;

  const flatItems = useMemo(() => [
    ...MAIN_TABS.filter((item) => visibleSet.has(item.id)).map((item) => ({
      key: item.id as MenuEntryId,
      label: item.label,
      icon: item.icon,
      href: buildTabHref(item.id),
      active: activeTab === item.id,
      onActivate: () => onTabChange(item.id),
    })),
    ...SEGMENT_ITEMS.filter((item) => visibleSet.has(`segment:${item.id}`)).map((item) => ({
      key: `segment:${item.id}` as MenuEntryId,
      label: item.label,
      icon: item.icon,
      href: buildTabHref("segments", item.id),
      active: activeTab === "segments" && activeSegment === item.id,
      onActivate: () => {
        onTabChange("segments");
        onSegmentChange(item.id);
      },
    })),
  ], [activeSegment, activeTab, onSegmentChange, onTabChange, visibleSet]);

  const toggleVisibleItem = (itemId: MenuEntryId) => {
    setEffectiveVisibleItems((current) => {
      const exists = current.includes(itemId);
      if (exists) {
        if (current.length <= 1) return current;
        return current.filter((entry) => entry !== itemId);
      }
      return [...current, itemId];
    });
  };

  const resetVisibleItems = () => {
    setEffectiveVisibleItems(visibleItems);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(MENU_STORAGE_KEY);
    }
  };

  return (
    <aside className={`hidden flex-shrink-0 flex-col lg:flex ${collapsed ? "w-[92px]" : "w-[268px]"}`}>
      <div className="sticky top-4 flex max-h-[calc(100vh-2rem)] flex-col rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-xl backdrop-blur-sm theme-transition">
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
                <p className="text-[11px] uppercase tracking-widest text-[var(--text-muted)]">Cockpit terminal</p>
              </div>
            ) : <div className="flex-1" />}
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

        <nav className="flex-1 overflow-y-auto p-3">
          <div className="space-y-0.5">
            {flatItems.map((item) => (
              <NavItem
                key={item.key}
                active={item.active}
                label={item.label}
                icon={item.icon}
                href={item.href}
                onActivate={item.onActivate}
                collapsed={collapsed}
              />
            ))}
          </div>
        </nav>

        <div className="border-t border-[var(--line)] p-4">
          <div className={`mb-3 flex items-center ${collapsed ? "justify-center" : "gap-2"}`}>
            <a
              href="/rapports"
              className={`inline-flex items-center rounded-lg border border-[var(--cyan)]/30 bg-[var(--cyan)]/10 text-[var(--cyan)] transition hover:bg-[var(--cyan)]/20 ${
                collapsed ? "justify-center p-2" : "gap-2 px-3 py-2 text-[12px] font-medium"
              }`}
              title="Demander un rapport"
            >
              <FileText className="h-4 w-4" />
              {!collapsed ? <span>Rapport IA</span> : null}
            </a>
            <button
              type="button"
              onClick={() => setMenuSettingsOpen(true)}
              className={`inline-flex items-center rounded-lg border border-[var(--card-border)] bg-[var(--surface-hover)] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] ${
                collapsed ? "justify-center p-2" : "gap-2 px-3 py-2 text-[12px]"
              }`}
              title="Reglage du menu"
            >
              <Settings2 className="h-4 w-4" />
              {!collapsed ? <span>Reglage menu</span> : null}
            </button>
          </div>
          <div className={`flex items-center ${collapsed ? "justify-center" : "gap-2.5"}`}>
            <div className={`h-2 w-2 rounded-full ${isLoading ? "animate-pulse bg-amber-400" : "bg-emerald-400"}`} />
            {!collapsed ? (
              <p className="text-[12px] text-[var(--text-secondary)]">
                {isLoading ? "Actualisation..." : "Operationnel"}
              </p>
            ) : null}
          </div>
          {!collapsed ? (
            <p className="mt-2 text-[11px] text-[var(--text-muted)]">
              Dernier point : {latestDate}
            </p>
          ) : null}
          {!collapsed && activeShipping ? (
            <div className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--surface-hover)] p-2.5">
              <p className="mb-1.5 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                Filtre armateur
              </p>
              <ShippingBadge rawValue={activeShipping.label} />
            </div>
          ) : null}
        </div>
      </div>

      {menuSettingsOpen ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Configuration du menu</h3>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Masque ou affiche les onglets. Le choix est sauvegarde en local sur cet appareil.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMenuSettingsOpen(false)}
                className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                title="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
              <div className="mb-4 rounded-xl border border-[var(--card-border)] bg-[var(--surface-hover)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                La configuration locale surcharge la configuration par defaut du projet. Minimum visible : 1 entree.
              </div>

              <div className="space-y-5">
                {MENU_GROUPS.map((group) => (
                  <section key={group.label} className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        {group.label}
                      </h4>
                      <span className="text-xs text-[var(--text-muted)]">
                        {group.items.filter((item) => visibleSet.has(item.id)).length}/{group.items.length} visibles
                      </span>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      {group.items.map((item) => {
                        const checked = visibleSet.has(item.id);
                        return (
                          <label
                            key={item.id}
                            className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-3 transition ${
                              checked
                                ? "border-cyan-400/30 bg-cyan-500/10"
                                : "border-[var(--card-border)] bg-[var(--surface-hover)]"
                            }`}
                          >
                            <span className="text-sm font-medium text-[var(--text-primary)]">{item.label}</span>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleVisibleItem(item.id)}
                              disabled={checked && !canHideItem}
                              className="h-4 w-4 rounded border-[var(--card-border)] bg-[var(--input-bg)] text-cyan-500 focus:ring-cyan-500/30"
                            />
                          </label>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-[var(--line)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={resetVisibleItems}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--surface-hover)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
              >
                <RotateCcw className="h-4 w-4" />
                Reinitialiser
              </button>
              <button
                type="button"
                onClick={() => setMenuSettingsOpen(false)}
                className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
