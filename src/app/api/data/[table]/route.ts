import { NextResponse } from "next/server";
import { query } from "@/lib/db";

const TABLE_CONFIG = {
  dim_date: { schema: "kct", hasCalendar: true, hasDateRapport: false, hasShipping: false, hasService: false },
  kct_escales_armateurs: { schema: "kct", hasCalendar: false, hasDateRapport: true, hasShipping: false, hasService: false },
  kct_exploitants_parc: { schema: "kct", hasCalendar: false, hasDateRapport: true, hasShipping: false, hasService: false },
  kct_gate_ttt: { schema: "kct", hasCalendar: false, hasDateRapport: true, hasShipping: false, hasService: false },
  kct_kpis: { schema: "kct", hasCalendar: false, hasDateRapport: true, hasShipping: false, hasService: false },
  kct_navires_appareilles: { schema: "kct", hasCalendar: false, hasDateRapport: true, hasShipping: true, hasService: true },
  kct_navires_attendus: { schema: "kct", hasCalendar: false, hasDateRapport: true, hasShipping: true, hasService: true },
  kct_navires_operation: { schema: "kct", hasCalendar: false, hasDateRapport: true, hasShipping: true, hasService: true },
  kct_operations_escales: { schema: "kct", hasCalendar: false, hasDateRapport: true, hasShipping: true, hasService: true },
  kct_parc_conteneurs: { schema: "kct", hasCalendar: false, hasDateRapport: true, hasShipping: false, hasService: false },
  kct_rapport_quotidien: { schema: "kct", hasCalendar: false, hasDateRapport: true, hasShipping: false, hasService: false },
  kct_volumes_teu: { schema: "kct", hasCalendar: false, hasDateRapport: true, hasShipping: false, hasService: false },
  v_kct_daily: { schema: "kct", hasCalendar: true, hasDateRapport: true, hasShipping: false, hasService: false },
  v_kct_monthly: { schema: "kct", hasCalendar: true, hasDateRapport: false, hasShipping: false, hasService: false },
  v_kct_weekly: { schema: "kct", hasCalendar: true, hasDateRapport: false, hasShipping: false, hasService: false },
  v_navires_performance: { schema: "kct", hasCalendar: false, hasDateRapport: true, hasShipping: true, hasService: true },
} as const;

type AllowedTable = keyof typeof TABLE_CONFIG;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ table: string }> },
) {
  const { table } = await params;
  const config = TABLE_CONFIG[table as AllowedTable];

  if (!config) {
    return NextResponse.json({ error: "Invalid table or view name" }, { status: 400 });
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
    const limit = limitParam && !Number.isNaN(Number(limitParam)) ? Number(limitParam) : 100;

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
      if (startDate) {
        values.push(startDate);
        conditions.push(`date_rapport >= $${values.length}::date`);
      }
      if (endDate) {
        values.push(endDate);
        conditions.push(`date_rapport <= $${values.length}::date`);
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
    if (requestedOrderBy) {
      const safeOrderBy = requestedOrderBy.replace(/[^a-zA-Z0-9_]/g, "");
      if (safeOrderBy) {
        queryText += ` ORDER BY ${safeOrderBy} ${orderDir}`;
      }
    }

    values.push(limit);
    queryText += ` LIMIT $${values.length}`;

    const result = await query(queryText, values);
    return NextResponse.json({ data: result.rows });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
