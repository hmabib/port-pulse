import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import {
  CUMULATIVE_VOLUME_FIELDS,
  decumulateMonthlyVolumes,
  dedupeByReportDate,
} from "@/lib/data-quality";

/**
 * `dailySnapshot` : la table produit au plus un état par jour. Plusieurs
 * bulletins ayant été observés sur une même date, la ligne retenue doit être
 * arbitrée explicitement plutôt que laissée à l'ordre de tri du moteur.
 *
 * `cumulativeVolumes` : les volumes sont des cumuls mensuels remis à zéro au
 * premier bulletin du mois ; les champs `*_jour` sont dérivés par différence.
 */
const TABLE_CONFIG = {
  dim_date: { schema: "kct", hasCalendar: true, hasDateRapport: false, hasShipping: false, hasService: false, dailySnapshot: false, cumulativeVolumes: false },
  kct_escales_armateurs: { schema: "kct", hasCalendar: false, hasDateRapport: true, hasShipping: false, hasService: false, dailySnapshot: true, cumulativeVolumes: false },
  kct_exploitants_parc: { schema: "kct", hasCalendar: false, hasDateRapport: true, hasShipping: false, hasService: false, dailySnapshot: true, cumulativeVolumes: false },
  kct_gate_ttt: { schema: "kct", hasCalendar: false, hasDateRapport: true, hasShipping: false, hasService: false, dailySnapshot: true, cumulativeVolumes: false },
  kct_kpis: { schema: "kct", hasCalendar: false, hasDateRapport: true, hasShipping: false, hasService: false, dailySnapshot: true, cumulativeVolumes: false },
  kct_navires_appareilles: { schema: "kct", hasCalendar: false, hasDateRapport: true, hasShipping: true, hasService: true, dailySnapshot: false, cumulativeVolumes: false },
  kct_navires_attendus: { schema: "kct", hasCalendar: false, hasDateRapport: true, hasShipping: true, hasService: true, dailySnapshot: false, cumulativeVolumes: false },
  kct_navires_operation: { schema: "kct", hasCalendar: false, hasDateRapport: true, hasShipping: true, hasService: true, dailySnapshot: false, cumulativeVolumes: false },
  kct_operations_escales: { schema: "kct", hasCalendar: false, hasDateRapport: true, hasShipping: true, hasService: true, dailySnapshot: false, cumulativeVolumes: false },
  kct_parc_conteneurs: { schema: "kct", hasCalendar: false, hasDateRapport: true, hasShipping: false, hasService: false, dailySnapshot: true, cumulativeVolumes: false },
  kct_rapport_quotidien: { schema: "kct", hasCalendar: false, hasDateRapport: true, hasShipping: false, hasService: false, dailySnapshot: true, cumulativeVolumes: false },
  kct_volumes_teu: { schema: "kct", hasCalendar: false, hasDateRapport: true, hasShipping: false, hasService: false, dailySnapshot: true, cumulativeVolumes: true },
  v_kct_daily: { schema: "kct", hasCalendar: true, hasDateRapport: true, hasShipping: false, hasService: false, dailySnapshot: true, cumulativeVolumes: true },
  v_kct_monthly: { schema: "kct", hasCalendar: true, hasDateRapport: false, hasShipping: false, hasService: false, dailySnapshot: false, cumulativeVolumes: false },
  v_kct_weekly: { schema: "kct", hasCalendar: true, hasDateRapport: false, hasShipping: false, hasService: false, dailySnapshot: false, cumulativeVolumes: false },
  v_navires_performance: { schema: "kct", hasCalendar: false, hasDateRapport: true, hasShipping: true, hasService: true, dailySnapshot: false, cumulativeVolumes: false },
} as const;

type AllowedTable = keyof typeof TABLE_CONFIG;

/** Colonnes autorisées au tri : liste blanche, jamais une chaîne libre. */
const ORDERABLE_COLUMNS = new Set([
  "date_rapport",
  "annee",
  "mois_num",
  "annee_mois",
  "jour_du_mois",
  "total_teu",
  "nom_navire",
  "shipping",
  "service",
]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ table: string }> },
) {
  const { table } = await params;
  const config = TABLE_CONFIG[table as AllowedTable];

  if (!config) {
    return NextResponse.json({ error: "Table ou vue inconnue" }, { status: 400 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const year = searchParams.get("year");
    const month = searchParams.get("month");
    const day = searchParams.get("day");
    const shipping = searchParams.get("shipping");
    const shippingIn = searchParams.get("shippingIn");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const orderDir = searchParams.get("orderDir") === "ASC" ? "ASC" : "DESC";

    const values: Array<string | number | string[]> = [];
    const conditions: string[] = [];

    const parsedLimit = Number(limitParam);
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(Math.trunc(parsedLimit), 2000)
      : 100;

    let queryText = `SELECT * FROM ${config.schema}.${table}`;

    if (config.hasCalendar) {
      if (year) {
        values.push(year);
        conditions.push(`annee = $${values.length}::int`);
      }
      if (month) {
        values.push(month);
        conditions.push(`mois_num = $${values.length}::int`);
      }
      if (day && table === "v_kct_daily") {
        values.push(day);
        conditions.push(`jour_du_mois = $${values.length}::int`);
      }
    }

    if (config.hasDateRapport) {
      // `startDate`/`endDate` sont dérivés de année/mois/jour côté client.
      // Appliquer les deux jeux de conditions produisait des filtres redondants,
      // et des résultats vides inexpliqués dès que les deux divergeaient.
      const hasExplicitRange = Boolean(startDate || endDate);

      if (hasExplicitRange) {
        if (startDate) {
          values.push(startDate);
          conditions.push(`date_rapport >= $${values.length}::date`);
        }
        if (endDate) {
          values.push(endDate);
          conditions.push(`date_rapport <= $${values.length}::date`);
        }
      } else {
        if (year) {
          values.push(year);
          conditions.push(`EXTRACT(YEAR FROM date_rapport) = $${values.length}::int`);
        }
        if (month) {
          values.push(month);
          conditions.push(`EXTRACT(MONTH FROM date_rapport) = $${values.length}::int`);
        }
        if (day) {
          values.push(day);
          conditions.push(`EXTRACT(DAY FROM date_rapport) = $${values.length}::int`);
        }
      }
    }

    if (config.hasShipping && shipping) {
      values.push(shipping);
      conditions.push(`shipping = $${values.length}`);
    }

    if (config.hasShipping && shippingIn) {
      const aliases = shippingIn
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

      if (aliases.length > 0) {
        values.push(aliases);
        conditions.push(`shipping = ANY($${values.length}::text[])`);
      }
    }

    if (conditions.length > 0) {
      queryText += ` WHERE ${conditions.join(" AND ")}`;
    }

    const requestedOrderBy = searchParams.get("orderBy");
    if (requestedOrderBy && ORDERABLE_COLUMNS.has(requestedOrderBy)) {
      queryText += ` ORDER BY ${requestedOrderBy} ${orderDir}`;
    }

    values.push(limit);
    queryText += ` LIMIT $${values.length}`;

    const result = await query(queryText, values);
    let rows: Array<Record<string, unknown>> = result.rows;

    // Les mêmes garde-fous qu'au rendu serveur, afin qu'un filtre ne produise
    // jamais des chiffres différents de ceux du chargement initial.
    if (config.dailySnapshot) {
      rows = dedupeByReportDate(rows);
    }
    if (config.cumulativeVolumes) {
      rows = decumulateMonthlyVolumes(rows, [...CUMULATIVE_VOLUME_FIELDS]);
    }
    if (config.dailySnapshot && orderDir === "DESC") {
      rows = [...rows].reverse();
    }

    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error("Erreur base de données:", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
