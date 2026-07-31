/**
 * Port Pulse — Socle de qualité des données.
 *
 * Source unique de vérité pour :
 *  - le nettoyage des horodatages issus de l'OCR des bulletins,
 *  - la déduplication des bulletins,
 *  - le dé-cumul des volumes mensuels,
 *  - les garde-fous de vraisemblance métier.
 *
 * PRINCIPE : une valeur suspecte n'est jamais supprimée silencieusement.
 * Elle est écartée du calcul ET signalée, via le type `Guarded<T>`.
 *
 * NOTE MÉTIER IMPORTANTE — TAUX D'OCCUPATION
 * Les taux d'occupation parc et reefers PEUVENT légitimement dépasser 100 %.
 * Il s'agit de faits réels (gerbage au-delà de la capacité nominale, prises
 * temporaires, capacité de référence conservatrice). Ces valeurs ne sont donc
 * NI bornées, NI rejetées, NI signalées comme anomalies.
 */

/* ══════════════════════════════════════════════════════════════════
   1. RÈGLES
   ══════════════════════════════════════════════════════════════════ */

export const QUALITY_RULES = {
  /** R1 — Période d'exploitation connue. Hors bornes = rejet. */
  dateMin: "2025-09-01",

  /** R6/R7 — Fenêtre de vraisemblance d'un événement déjà survenu (ATA/ATB/ATC/ATD),
   *  relativement à la date du bulletin qui le rapporte. */
  pastEventWindow: { backDays: 45, forwardDays: 3 },

  /** R6/R7 — Fenêtre de vraisemblance d'une estimation (ETA/ETC). */
  futureEventWindow: { backDays: 10, forwardDays: 60 },

  /** R8 — Productivité nette par navire, en mvts/h. Hors bornes = exclu des moyennes. */
  prodMin: 1,
  prodMax: 100,

  /** R9 — Temps de rotation camion, en minutes. */
  tttMin: 5,
  tttMax: 480,

  /** R10 — Durée d'escale plausible, en heures. */
  cycleMinHours: 0,
  cycleMaxHours: 21 * 24,

  /** R11 — Gabarit navire, en mètres. */
  loaMin: 50,
  loaMax: 450,

  /** R12 — En deçà, une moyenne n'est pas publiée. */
  minSampleForAverage: 5,

  /** R13 — Corrélation de Pearson : effectif minimal. */
  minSampleForCorrelation: 8,

  /** R4 — Au-delà, la courbe est rompue plutôt que reliée. */
  maxGapDaysForTrend: 3,

  /** Heures conventionnelles retenues pour les estimations AM / PM. */
  meridiemHours: { am: 10, pm: 18 },
} as const;

/* ══════════════════════════════════════════════════════════════════
   2. TYPE GARDÉ
   ══════════════════════════════════════════════════════════════════ */

export type GuardStatus = "ok" | "suspect" | "rejected";

export type Guarded<T> =
  | { status: "ok"; value: T }
  /** Valeur exploitable mais à signaler à l'écran. */
  | { status: "suspect"; value: T; reason: string }
  /** Valeur inexploitable : afficher « — » et la raison. */
  | { status: "rejected"; reason: string };

export const ok = <T>(value: T): Guarded<T> => ({ status: "ok", value });
export const suspect = <T>(value: T, reason: string): Guarded<T> => ({ status: "suspect", value, reason });
export const rejected = <T>(reason: string): Guarded<T> => ({ status: "rejected", reason });

/** Valeur si exploitable (ok ou suspect), sinon `null`. */
export function valueOf<T>(g: Guarded<T>): T | null {
  return g.status === "rejected" ? null : g.value;
}

/** N'accepte que les valeurs pleinement fiables — pour les moyennes et les modèles. */
export function strictValueOf<T>(g: Guarded<T>): T | null {
  return g.status === "ok" ? g.value : null;
}

export function isUsable<T>(g: Guarded<T>): boolean {
  return g.status !== "rejected";
}

/* ══════════════════════════════════════════════════════════════════
   3. NETTOYAGE OCR DES HORODATAGES
   ══════════════════════════════════════════════════════════════════

   Formats réellement rencontrés dans le schéma kct (relevé du 31/07/2026) :

     "27/07 17:27"            format nominal, sans année
     "13/05/26 21:18"         année sur 2 chiffres
     "10/06/206 17:12"        année tronquée par l'OCR  (206 → 2026)
     "01/11/20222:30"         année corrompue + heure collée
     "06/02/202619:30"        année complète + heure collée
     "10/1005:00"             espace manquant, heure collée
     "28/12/2025 15/24"       « / » au lieu de « : » dans l'heure
     "11/10/2025 AM-TBC"      demi-journée, heure non confirmée
     "20/01/2026 PM"          demi-journée seule
     "01/06/2026 22:54/TBC"   heure + suffixe
     "TBC"                    aucune information
     "587"                    colonne décalée à l'OCR
     ""                       vide
*/

/** Confusions de caractères typiques d'un OCR sur des chiffres. */
function repairOcrGlyphs(text: string): string {
  return text
    .replace(/[Oo](?=\d)|(?<=\d)[Oo]/g, "0")
    .replace(/[lI](?=\d)|(?<=\d)[lI]/g, "1")
    .replace(/(?<=\d)[Ss](?=\d)/g, "5")
    .replace(/(?<=\d)[Bb](?=\d)/g, "8");
}

interface NormalizedTimestamp {
  text: string;
  meridiem: "am" | "pm" | null;
  unconfirmed: boolean;
}

function normalizeTimestampText(raw: string): NormalizedTimestamp {
  let text = raw.trim().toUpperCase();

  const unconfirmed = /\bTBC\b/.test(text);
  text = text.replace(/[/\-\s]*\bTBC\b/g, " ");

  let meridiem: "am" | "pm" | null = null;
  if (/\bAM\b/.test(text)) meridiem = "am";
  else if (/\bPM\b/.test(text)) meridiem = "pm";
  text = text.replace(/\b(AM|PM)\b/g, " ");

  text = repairOcrGlyphs(text);
  text = text.replace(/[.\-]/g, "/");
  text = text.replace(/\bH\b|(?<=\d)H(?=\d)/g, ":");
  text = text.replace(/\s+/g, " ").trim();

  return { text, meridiem, unconfirmed };
}

/** Vrai si (y, m, d) existe réellement au calendrier — écarte 31/02, 31/04… */
function isRealCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

interface TimestampParts {
  day: number;
  month: number;
  year: number | null;
  hour: number;
  minute: number;
  hasTime: boolean;
}

/**
 * Extraction tolérante. Les motifs sont essayés du plus complet au plus pauvre :
 * l'année et l'heure peuvent être absentes, collées ou corrompues.
 */
function extractParts(text: string): TimestampParts | null {
  //  JJ/MM/AAAA HH:MM   — année et heure présentes (éventuellement collées)
  let m = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\D*(\d{1,2})[:/](\d{2})/);
  if (m) {
    return {
      day: +m[1], month: +m[2], year: +m[3],
      hour: +m[4], minute: +m[5], hasTime: true,
    };
  }

  //  JJ/MM/AAAA   — date seule, année présente.
  //  Doit être tenté AVANT le motif sans année : « 11/10/2025 » se laisserait
  //  sinon lire comme « 11/1 » + heure « 0:20 », le séparateur « / » étant
  //  accepté dans l'heure pour absorber les OCR du type « 15/24 ».
  m = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?!\d)/);
  if (m) {
    return {
      day: +m[1], month: +m[2], year: +m[3],
      hour: 0, minute: 0, hasTime: false,
    };
  }

  //  JJ/MM HH:MM   — pas d'année
  m = text.match(/^(\d{1,2})\/(\d{1,2})\D*(\d{1,2})[:/](\d{2})/);
  if (m) {
    return {
      day: +m[1], month: +m[2], year: null,
      hour: +m[3], minute: +m[4], hasTime: true,
    };
  }

  //  JJ/MM   — date seule, sans année
  m = text.match(/^(\d{1,2})\/(\d{1,2})(?!\d)/);
  if (m) {
    return {
      day: +m[1], month: +m[2], year: null,
      hour: 0, minute: 0, hasTime: false,
    };
  }

  //  Rien d'exploitable : valeur numérique parasite, texte libre, vide.
  return null;
}

/**
 * Répare une année lue par OCR.
 * Retourne `null` si l'année est jugée non fiable — elle sera alors ré-inférée
 * à partir de la date du bulletin, ce qui est plus sûr que de la croire.
 */
function repairYear(raw: number | null, referenceYear: number): number | null {
  if (raw === null) return null;
  if (raw >= 1000) {
    //  Année à 4 chiffres : n'est retenue que si elle est proche du bulletin.
    //  « 2022 » sur un bulletin de 2026 est une corruption, pas un fait.
    return Math.abs(raw - referenceYear) <= 1 ? raw : null;
  }
  if (raw >= 100) {
    //  Troncature type « 206 » pour « 2026 » : non fiable, on ré-infère.
    return null;
  }
  if (raw >= 0 && raw < 100) {
    const expanded = 2000 + raw;
    return Math.abs(expanded - referenceYear) <= 1 ? expanded : null;
  }
  return null;
}

function toUtc(parts: TimestampParts, year: number): Date | null {
  if (!isRealCalendarDate(year, parts.month, parts.day)) return null;
  if (parts.hour > 23 || parts.minute > 59) return null;
  return new Date(Date.UTC(year, parts.month - 1, parts.day, parts.hour, parts.minute));
}

export function normalizeDateOnly(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = typeof value === "string" ? value : String(value ?? "");
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

export type EventKind = "past" | "estimate";

/**
 * Convertit un horodatage de bulletin en date UTC fiable.
 *
 * L'année est le point faible : elle est absente du format nominal et souvent
 * corrompue par l'OCR quand elle est présente. La stratégie est donc :
 *
 *   1. si une année est lisible ET cohérente avec le bulletin, on la retient ;
 *   2. sinon on teste les années candidates (N-1, N, N+1) et on conserve celle
 *      qui place l'événement dans la fenêtre de vraisemblance métier ;
 *   3. si aucune candidate ne convient, la valeur est rejetée.
 *
 * C'est cette étape 2 qui élimine les escales projetées à dix mois d'écart
 * lorsqu'un bulletin de janvier rapporte une escale de décembre.
 */
export function parseBulletinTimestamp(
  rawValue: unknown,
  reportDateValue: unknown,
  kind: EventKind = "past",
): Guarded<Date> {
  const raw = typeof rawValue === "string" ? rawValue : String(rawValue ?? "");
  if (!raw.trim()) return rejected("Horodatage absent du bulletin");

  const reportDate = normalizeDateOnly(reportDateValue);
  if (!reportDate) return rejected("Date de bulletin inconnue : année non inférable");

  const reference = new Date(`${reportDate}T00:00:00Z`);
  const referenceYear = reference.getUTCFullYear();

  const { text, meridiem, unconfirmed } = normalizeTimestampText(raw);
  if (!text) {
    return rejected(unconfirmed ? "Horodatage non confirmé (TBC)" : "Horodatage illisible");
  }

  const parts = extractParts(text);
  if (!parts) return rejected(`Format non reconnu : « ${raw.trim()} »`);

  //  Demi-journée : l'heure conventionnelle remplace l'heure absente.
  if (!parts.hasTime && meridiem) {
    parts.hour = QUALITY_RULES.meridiemHours[meridiem];
    parts.minute = 0;
  }

  const window = kind === "past" ? QUALITY_RULES.pastEventWindow : QUALITY_RULES.futureEventWindow;
  const lowerBound = reference.getTime() - window.backDays * 86_400_000;
  const upperBound = reference.getTime() + window.forwardDays * 86_400_000;

  const declaredYear = repairYear(parts.year, referenceYear);

  //  Années candidates, ordonnées : l'année lisible d'abord si elle est fiable.
  const candidateYears = declaredYear !== null
    ? [declaredYear]
    : [referenceYear, referenceYear - 1, referenceYear + 1];

  let best: { date: Date; distance: number } | null = null;
  let sawValidCalendarDate = false;

  for (const year of candidateYears) {
    const candidate = toUtc(parts, year);
    if (!candidate) continue;
    sawValidCalendarDate = true;
    const time = candidate.getTime();
    if (time < lowerBound || time > upperBound) continue;
    const distance = Math.abs(time - reference.getTime());
    if (!best || distance < best.distance) best = { date: candidate, distance };
  }

  //  L'année lue était plausible en apparence mais place l'événement hors fenêtre :
  //  on la traite comme corrompue et on ré-infère.
  if (!best && declaredYear !== null) {
    for (const year of [referenceYear, referenceYear - 1, referenceYear + 1]) {
      const candidate = toUtc(parts, year);
      if (!candidate) continue;
      sawValidCalendarDate = true;
      const time = candidate.getTime();
      if (time < lowerBound || time > upperBound) continue;
      const distance = Math.abs(time - reference.getTime());
      if (!best || distance < best.distance) best = { date: candidate, distance };
    }
    if (best) {
      return suspect(best.date, `Année corrigée depuis « ${raw.trim()} » (OCR)`);
    }
  }

  if (!best) {
    return rejected(
      sawValidCalendarDate
        ? `Date hors fenêtre de vraisemblance : « ${raw.trim()} » vs bulletin du ${reportDate}`
        : `Date inexistante au calendrier : « ${raw.trim()} »`,
    );
  }

  if (unconfirmed) return suspect(best.date, "Horodatage annoncé non confirmé (TBC)");
  if (!parts.hasTime && !meridiem) return suspect(best.date, "Heure absente, minuit retenu par défaut");
  if (!parts.hasTime && meridiem) return suspect(best.date, `Demi-journée ${meridiem.toUpperCase()} : heure conventionnelle`);
  if (parts.year === null) return ok(best.date);

  return ok(best.date);
}

/** Adaptateur pour le code existant attendant `Date | null`. */
export function parseBulletinTimestampOrNull(
  rawValue: unknown,
  reportDateValue: unknown,
  kind: EventKind = "past",
): Date | null {
  return valueOf(parseBulletinTimestamp(rawValue, reportDateValue, kind));
}

/* ══════════════════════════════════════════════════════════════════
   4. COHÉRENCE DE LA SÉQUENCE D'ESCALE
   ══════════════════════════════════════════════════════════════════ */

export interface CallTimeline {
  ata: Date | null;
  atb: Date | null;
  atc: Date | null;
  atd: Date | null;
}

/**
 * Une escale respecte ATA ≤ ATB ≤ ATC ≤ ATD.
 * Une inversion signale un horodatage mal reconstruit : les jalons fautifs
 * sont neutralisés plutôt que de produire des durées négatives.
 */
export function reconcileCallTimeline(timeline: CallTimeline): Guarded<CallTimeline> {
  const order: Array<keyof CallTimeline> = ["ata", "atb", "atc", "atd"];
  const result: CallTimeline = { ...timeline };
  const anomalies: string[] = [];

  let previousKey: keyof CallTimeline | null = null;
  for (const key of order) {
    const current = result[key];
    if (!current) continue;
    if (previousKey) {
      const previous = result[previousKey];
      if (previous && current.getTime() < previous.getTime()) {
        anomalies.push(`${key.toUpperCase()} antérieur à ${previousKey.toUpperCase()}`);
        result[key] = null;
        continue;
      }
    }
    previousKey = key;
  }

  const span = result.ata && result.atd
    ? (result.atd.getTime() - result.ata.getTime()) / 3_600_000
    : null;

  if (span !== null && span > QUALITY_RULES.cycleMaxHours) {
    return rejected(`Cycle de ${Math.round(span / 24)} jours : escale invraisemblable`);
  }

  if (anomalies.length > 0) return suspect(result, anomalies.join(" ; "));
  return ok(result);
}

/** Écart en heures. Retourne `null` si l'un des jalons manque ou si l'écart est négatif. */
export function hoursBetween(start: Date | null, end: Date | null): number | null {
  if (!start || !end) return null;
  const diff = (end.getTime() - start.getTime()) / 3_600_000;
  if (!Number.isFinite(diff) || diff < 0) return null;
  return diff;
}

/* ══════════════════════════════════════════════════════════════════
   5. DÉ-CUMUL DES VOLUMES
   ══════════════════════════════════════════════════════════════════ */

type Row = Record<string, unknown>;

function num(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

/**
 * `total_teu` et ses composantes sont des CUMULS MENSUELS qui se réinitialisent
 * au premier bulletin de chaque mois. Une moyenne ou un écart-type calculé
 * directement dessus n'a aucun sens métier.
 *
 * Cette fonction ajoute les champs `*_jour` correspondant au volume réellement
 * réalisé entre deux bulletins consécutifs d'un même mois.
 *
 * @param rows  Bulletins triés par date croissante, déjà dédupliqués.
 */
export function decumulateMonthlyVolumes(rows: Row[], fields: string[]): Row[] {
  const previousByMonth = new Map<string, Row>();

  return rows.map((row) => {
    const date = normalizeDateOnly(row.date_rapport);
    if (!date) return { ...row, volume_decumule_fiable: false };

    const monthKey = date.slice(0, 7);
    const previous = previousByMonth.get(monthKey);
    const enriched: Row = { ...row };

    for (const field of fields) {
      const current = num(row[field]);
      if (!previous) {
        //  Premier bulletin du mois : le cumul EST le volume de la période écoulée.
        enriched[`${field}_jour`] = current;
        continue;
      }
      const delta = current - num(previous[field]);
      //  Un delta négatif signale une correction de saisie en cours de mois :
      //  on ne propage pas de volume négatif.
      enriched[`${field}_jour`] = delta >= 0 ? delta : 0;
    }

    enriched.volume_decumule_fiable = Boolean(previous);
    previousByMonth.set(monthKey, row);
    return enriched;
  });
}

/** Champs cumulés du bulletin quotidien. */
export const CUMULATIVE_VOLUME_FIELDS = [
  "total_teu",
  "import_teu",
  "export_teu",
  "transbo_teu",
  "vides_teu",
] as const;

/* ══════════════════════════════════════════════════════════════════
   6. COUVERTURE CALENDAIRE
   ══════════════════════════════════════════════════════════════════ */

export interface CoverageReport {
  firstDate: string;
  lastDate: string;
  calendarDays: number;
  reportedDays: number;
  missingDays: number;
  coveragePct: number;
  /** Trous d'au moins `maxGapDaysForTrend` jours — les courbes y sont rompues. */
  gaps: Array<{ from: string; to: string; days: number }>;
}

export function analyzeCoverage(rows: Row[]): CoverageReport | null {
  const dates = Array.from(
    new Set(rows.map((row) => normalizeDateOnly(row.date_rapport)).filter(Boolean)),
  ).sort();

  if (dates.length === 0) return null;

  const first = new Date(`${dates[0]}T00:00:00Z`);
  const last = new Date(`${dates[dates.length - 1]}T00:00:00Z`);
  const calendarDays = Math.round((last.getTime() - first.getTime()) / 86_400_000) + 1;

  const gaps: CoverageReport["gaps"] = [];
  for (let i = 1; i < dates.length; i += 1) {
    const previous = new Date(`${dates[i - 1]}T00:00:00Z`).getTime();
    const current = new Date(`${dates[i]}T00:00:00Z`).getTime();
    const days = Math.round((current - previous) / 86_400_000);
    if (days > QUALITY_RULES.maxGapDaysForTrend) {
      gaps.push({ from: dates[i - 1], to: dates[i], days: days - 1 });
    }
  }

  return {
    firstDate: dates[0],
    lastDate: dates[dates.length - 1],
    calendarDays,
    reportedDays: dates.length,
    missingDays: calendarDays - dates.length,
    coveragePct: calendarDays > 0 ? (dates.length / calendarDays) * 100 : 0,
    gaps,
  };
}

export interface WeekdayCoverage {
  day: string;
  reported: number;
  expected: number;
  coveragePct: number;
}

const WEEKDAYS_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

/** Couverture calendaire ventilée par jour de semaine, sans masquer le biais du lundi. */
export function analyzeWeekdayCoverage(rows: Row[]): WeekdayCoverage[] {
  const dates = Array.from(
    new Set(rows.map((row) => normalizeDateOnly(row.date_rapport)).filter(Boolean)),
  ).sort();
  const counters = WEEKDAYS_FR.map((day) => ({ day, reported: 0, expected: 0, coveragePct: 0 }));
  if (dates.length === 0) return counters.slice(1).concat(counters[0]);

  const received = new Set(dates);
  const cursor = new Date(`${dates[0]}T00:00:00Z`);
  const end = new Date(`${dates[dates.length - 1]}T00:00:00Z`);
  while (cursor <= end) {
    const counter = counters[cursor.getUTCDay()];
    counter.expected += 1;
    if (received.has(cursor.toISOString().slice(0, 10))) counter.reported += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  for (const counter of counters) {
    counter.coveragePct = counter.expected > 0 ? (counter.reported / counter.expected) * 100 : 0;
  }
  return counters.slice(1).concat(counters[0]);
}

/** Dates portant plusieurs bulletins avant l'arbitrage de `dedupeByReportDate`. */
export function listDuplicateReportDates(rows: Row[]): Array<{ date: string; received: number; removed: number }> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const date = normalizeDateOnly(row.date_rapport);
    if (date) counts.set(date, (counts.get(date) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, received]) => ({ date, received, removed: received - 1 }));
}

/** Vrai si deux bulletins consécutifs sont trop éloignés pour être reliés par un trait. */
export function isTrendBreak(previousDate: unknown, currentDate: unknown): boolean {
  const a = normalizeDateOnly(previousDate);
  const b = normalizeDateOnly(currentDate);
  if (!a || !b) return true;
  const days = Math.round(
    (new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86_400_000,
  );
  return days > QUALITY_RULES.maxGapDaysForTrend;
}

/* ══════════════════════════════════════════════════════════════════
   7. DÉDUPLICATION
   ══════════════════════════════════════════════════════════════════ */

/**
 * Un même jour porte parfois plusieurs bulletins (jusqu'à cinq observés).
 * Sans arbitrage explicite, la ligne retenue dépend de l'ordre de tri de
 * PostgreSQL, qui n'est pas garanti : deux rafraîchissements peuvent afficher
 * deux chiffres différents. On retient le bulletin le plus complet, puis le
 * plus récemment ingéré.
 */
export function dedupeByReportDate(rows: Row[]): Row[] {
  const byDate = new Map<string, Row>();

  const completeness = (row: Row): number =>
    Object.values(row).filter((v) => v !== null && v !== undefined && v !== "").length;

  const ingestedAt = (row: Row): number => {
    const raw = row.created_at ?? row.inserted_at ?? row.updated_at;
    if (!raw) return 0;
    const time = new Date(String(raw)).getTime();
    return Number.isFinite(time) ? time : 0;
  };

  for (const row of rows) {
    const date = normalizeDateOnly(row.date_rapport);
    if (!date) continue;
    const held = byDate.get(date);
    if (!held) {
      byDate.set(date, row);
      continue;
    }
    const better =
      ingestedAt(row) !== ingestedAt(held)
        ? ingestedAt(row) > ingestedAt(held)
        : completeness(row) > completeness(held);
    if (better) byDate.set(date, row);
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, row]) => row);
}

/* ══════════════════════════════════════════════════════════════════
   8. GARDE-FOUS DE VRAISEMBLANCE
   ══════════════════════════════════════════════════════════════════ */

/** R8 — Productivité nette d'un navire, en mvts/h. */
export function guardProductivity(value: unknown): Guarded<number> {
  const prod = num(value);
  if (prod <= 0) return rejected("Productivité nulle ou négative");
  if (prod < QUALITY_RULES.prodMin) return suspect(prod, `Productivité < ${QUALITY_RULES.prodMin} mvt/h`);
  if (prod > QUALITY_RULES.prodMax) {
    return suspect(prod, `${prod.toFixed(1)} mvt/h : multi-portiques probable, nombre de grues non fourni`);
  }
  return ok(prod);
}

/** R9 — Temps de rotation camion, en minutes. */
export function guardTtt(value: unknown): Guarded<number> {
  const ttt = num(value);
  if (ttt <= 0) return rejected("TTT absent");
  if (ttt < QUALITY_RULES.tttMin || ttt > QUALITY_RULES.tttMax) {
    return rejected(`TTT de ${ttt} min hors bornes plausibles`);
  }
  return ok(ttt);
}

/** R11 — Gabarit navire. Le champ source est du texte (« 400M »). */
export function guardLoaMeters(value: unknown): Guarded<number> {
  const text = typeof value === "string" ? value : String(value ?? "");
  const match = text.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return rejected("LOA non renseignée");
  const loa = Number(match[1].replace(",", "."));
  if (!Number.isFinite(loa) || loa <= 0) return rejected("LOA illisible");
  if (loa < QUALITY_RULES.loaMin || loa > QUALITY_RULES.loaMax) {
    return rejected(`LOA de ${loa} m hors gabarit`);
  }
  return ok(loa);
}

export function loaBucket(value: unknown): string {
  const guarded = guardLoaMeters(value);
  const loa = strictValueOf(guarded);
  if (loa === null) return "Gabarit non déterminé";
  if (loa < 200) return "< 200 m";
  if (loa < 250) return "200 – 249 m";
  if (loa < 300) return "250 – 299 m";
  if (loa < 350) return "300 – 349 m";
  return "≥ 350 m";
}

/** R14 — Un bulletin à volume nul ne doit pas peser dans les moyennes. */
export function guardDailyVolume(value: unknown): Guarded<number> {
  const teu = num(value);
  if (teu <= 0) return rejected("Aucun volume déclaré sur ce bulletin");
  return ok(teu);
}

/* ══════════════════════════════════════════════════════════════════
   9. AGRÉGATS PROTÉGÉS
   ══════════════════════════════════════════════════════════════════ */

export interface SafeAverage {
  value: number | null;
  sampleSize: number;
  /** Vrai si l'effectif atteint le seuil de publication (R12). */
  publishable: boolean;
  excluded: number;
}

/**
 * Moyenne n'incluant que les valeurs fiables, et refusant de se publier
 * en deçà de l'effectif minimal. Mieux vaut « n insuffisant » qu'un chiffre
 * calculé sur deux observations.
 */
export function safeAverage(values: Array<Guarded<number>>): SafeAverage {
  const usable = values.map(strictValueOf).filter((v): v is number => v !== null);
  const excluded = values.length - usable.length;

  if (usable.length === 0) {
    return { value: null, sampleSize: 0, publishable: false, excluded };
  }

  const mean = usable.reduce((sum, v) => sum + v, 0) / usable.length;
  return {
    value: mean,
    sampleSize: usable.length,
    publishable: usable.length >= QUALITY_RULES.minSampleForAverage,
    excluded,
  };
}

/** Moyenne pondérée protégée — pour agréger des moyennes mensuelles. */
export function safeWeightedAverage(
  entries: Array<{ value: number; weight: number }>,
): SafeAverage {
  const usable = entries.filter((e) => Number.isFinite(e.value) && e.weight > 0);
  const totalWeight = usable.reduce((sum, e) => sum + e.weight, 0);

  if (totalWeight <= 0) {
    return { value: null, sampleSize: 0, publishable: false, excluded: entries.length };
  }

  return {
    value: usable.reduce((sum, e) => sum + e.value * e.weight, 0) / totalWeight,
    sampleSize: Math.round(totalWeight),
    publishable: totalWeight >= QUALITY_RULES.minSampleForAverage,
    excluded: entries.length - usable.length,
  };
}

/** R15 — Aucun `NaN`, aucun `Infinity`, aucun faux zéro. */
export function safeRatio(numerator: unknown, denominator: unknown): number | null {
  const a = num(numerator);
  const b = num(denominator);
  if (b === 0) return null;
  const ratio = a / b;
  return Number.isFinite(ratio) ? ratio : null;
}

export function safePercent(numerator: unknown, denominator: unknown): number | null {
  const ratio = safeRatio(numerator, denominator);
  return ratio === null ? null : ratio * 100;
}

/* ══════════════════════════════════════════════════════════════════
   10. SYNTHÈSE QUALITÉ
   ══════════════════════════════════════════════════════════════════ */

export interface QualitySummary {
  coverage: CoverageReport | null;
  duplicatesRemoved: number;
  rejections: Array<{ rule: string; count: number; sample: string }>;
  totalRejected: number;
  totalSuspect: number;
}

export function summarizeQuality(
  rawRows: Row[],
  dedupedRows: Row[],
  guards: Array<{ rule: string; results: Array<Guarded<unknown>> }>,
): QualitySummary {
  const rejections: QualitySummary["rejections"] = [];
  let totalRejected = 0;
  let totalSuspect = 0;

  for (const { rule, results } of guards) {
    const rejectedOnes = results.filter((r) => r.status === "rejected");
    const suspectOnes = results.filter((r) => r.status === "suspect");
    totalRejected += rejectedOnes.length;
    totalSuspect += suspectOnes.length;
    if (rejectedOnes.length > 0) {
      rejections.push({
        rule,
        count: rejectedOnes.length,
        sample: (rejectedOnes[0] as { reason: string }).reason,
      });
    }
  }

  return {
    coverage: analyzeCoverage(dedupedRows),
    duplicatesRemoved: rawRows.length - dedupedRows.length,
    rejections: rejections.sort((a, b) => b.count - a.count),
    totalRejected,
    totalSuspect,
  };
}
