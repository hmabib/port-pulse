/**
 * Conventions de représentation graphique — Port Pulse.
 *
 * Deux principes :
 *  1. Les séries se distinguent par la VALEUR (clair / foncé), jamais par la
 *     teinte. La couleur reste ainsi disponible pour signaler une anomalie.
 *  2. Les valeurs sont lisibles à l'écran, pas seulement à l'export. Un
 *     graphique dont il faut survoler chaque point pour lire un chiffre est
 *     inutilisable en réunion et à l'impression.
 */

import { QUALITY_RULES, normalizeDateOnly } from "@/lib/data-quality";

/* ── Palette de séries : monochrome bleu, ordre imposé ── */

export const SERIES_COLORS = [
  "#164b7e", // pak-700
  "#2e90d9", // pak-500
  "#5fb0e8", // pak-400
  "#93cbf2", // pak-300
  "#c2e1f8", // pak-200
] as const;

/** Au-delà de cinq séries, regrouper la longue traîne plutôt qu'inventer une teinte. */
export const MAX_SERIES = SERIES_COLORS.length;

export function seriesColor(index: number): string {
  return SERIES_COLORS[index % SERIES_COLORS.length];
}

/* ── Couleurs sémantiques : alertes et références uniquement ── */

export const SEMANTIC = {
  critical: "#f87171",
  warning: "#fbbf24",
  success: "#4ade80",
  /** Budget, cible, seuil : toujours neutre et en tirets. */
  reference: "#94a3b8",
  neutral: "#7396b5",
} as const;

/* ── Étiquettes de valeur ── */

const LABEL_FILL = "#7396b5";
const LABEL_SIZE = 10;

export function formatChartValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num) || num === 0) return "";
  if (Math.abs(num) >= 10_000) return `${Math.round(num / 1000)}k`;
  if (Number.isInteger(num)) return num.toLocaleString("fr-FR");
  return num.toFixed(1);
}

/**
 * Barres verticales : la valeur est posée au-dessus.
 * Affichée en permanence — c'est la lecture par défaut attendue d'un cockpit.
 */
export const BAR_VALUE_LABEL = {
  position: "top" as const,
  fill: LABEL_FILL,
  fontSize: LABEL_SIZE,
  formatter: formatChartValue,
};

/** Barres horizontales : la valeur est posée en bout de barre. */
export const BAR_VALUE_LABEL_RIGHT = {
  position: "right" as const,
  fill: LABEL_FILL,
  fontSize: LABEL_SIZE,
  formatter: formatChartValue,
};

/** Barres empilées : la valeur se place à l'intérieur du segment. */
export const BAR_VALUE_LABEL_INSIDE = {
  position: "inside" as const,
  fill: "#ffffff",
  fontSize: LABEL_SIZE,
  formatter: formatChartValue,
};

/**
 * Courbes : étiqueter chaque point d'une série journalière la rendrait
 * illisible. Les valeurs restent donc réservées à l'export, où la densité
 * est maîtrisée, et la lecture à l'écran passe par l'infobulle.
 */
export function lineValueLabel(isExporting: boolean) {
  return isExporting
    ? { fill: LABEL_FILL, fontSize: LABEL_SIZE, formatter: formatChartValue }
    : false;
}

/* ── Ruptures de tracé sur trous de collecte ── */

/**
 * Environ un tiers des jours n'ont pas de bulletin. Relier deux points
 * séparés par une semaine par un trait continu laisse croire à une
 * évolution régulière qui n'a pas été observée.
 *
 * Cette fonction insère une valeur nulle entre deux relevés trop éloignés :
 * associée à `connectNulls={false}`, elle produit une rupture visible.
 */
export function withTrendBreaks<T extends Record<string, unknown>>(
  rows: T[],
  valueKeys: string[],
  dateKey = "date_rapport",
): Array<T | Record<string, unknown>> {
  if (rows.length < 2) return rows;

  const result: Array<T | Record<string, unknown>> = [];

  for (let i = 0; i < rows.length; i += 1) {
    const current = rows[i];
    if (i > 0) {
      const previousDate = normalizeDateOnly(rows[i - 1][dateKey]);
      const currentDate = normalizeDateOnly(current[dateKey]);
      if (previousDate && currentDate) {
        const gapDays = Math.round(
          (new Date(`${currentDate}T00:00:00Z`).getTime() -
            new Date(`${previousDate}T00:00:00Z`).getTime()) /
            86_400_000,
        );
        if (gapDays > QUALITY_RULES.maxGapDaysForTrend) {
          const blank: Record<string, unknown> = { [dateKey]: `${previousDate}·gap` };
          for (const key of valueKeys) blank[key] = null;
          blank.__gap = true;
          result.push(blank);
        }
      }
    }
    result.push(current);
  }

  return result;
}

/* ── Camembert ou barres ? ── */

/**
 * Un camembert n'est lisible qu'au-delà de peu de parts, et ne convient
 * qu'à une décomposition dont la somme fait un tout. Un taux d'occupation
 * n'est pas une répartition : il appelle une jauge.
 */
export function shouldUsePie(slices: number): boolean {
  return slices > 1 && slices <= 5;
}

/* ── Axes ── */

/** Les barres partent toujours de zéro : un axe tronqué exagère les écarts. */
export const BAR_AXIS_DOMAIN: [number, string] = [0, "auto"];

/** Mention d'effectif à afficher sous un titre de graphique. */
export function sampleNote(count: number, unit = "bulletins"): string {
  if (count === 0) return "aucune donnée";
  return `sur ${count.toLocaleString("fr-FR")} ${unit}`;
}
