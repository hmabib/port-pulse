import DashboardClient from "@/components/DashboardClient";
import { query } from "@/lib/db";
import { getUniqueShippingOptions } from "@/lib/shipping";

export const dynamic = "force-dynamic";

function asNumber(value: unknown): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

export default async function Page() {
  const [
    yearsRes,
    monthsRes,
    shippingRes,
    dailyRes,
    performanceRes,
    monthlyRes,
    gateRes,
    armateursRes,
    exploitantsRes,
    naviresAttendusRes,
    naviresAppareillesRes,
    naviresOperationRes,
    operationsEscalesRes,
    parcConteneursRes,
    rapportQuotidienRes,
    kpisRes,
  ] = await Promise.all([
    query(`SELECT DISTINCT annee FROM kct.dim_date WHERE annee IS NOT NULL ORDER BY annee DESC`),
    query(
      `SELECT DISTINCT mois_num, mois_nom_fr FROM kct.dim_date WHERE mois_num IS NOT NULL ORDER BY mois_num ASC`,
    ),
    query(
      `SELECT DISTINCT shipping FROM kct.v_navires_performance WHERE shipping IS NOT NULL ORDER BY shipping ASC`,
    ),
    query(`SELECT * FROM kct.v_kct_daily ORDER BY date_rapport DESC LIMIT 400`),
    query(`SELECT * FROM kct.v_navires_performance ORDER BY date_rapport DESC LIMIT 1000`),
    query(`SELECT * FROM kct.v_kct_monthly ORDER BY annee DESC, mois_num DESC LIMIT 18`),
    query(`SELECT * FROM kct.kct_gate_ttt ORDER BY date_rapport DESC LIMIT 400`),
    query(`SELECT * FROM kct.kct_escales_armateurs ORDER BY date_rapport DESC LIMIT 20`),
    query(`SELECT * FROM kct.kct_exploitants_parc ORDER BY date_rapport DESC LIMIT 20`),
    query(`SELECT * FROM kct.kct_navires_attendus ORDER BY date_rapport DESC LIMIT 10`),
    query(`SELECT * FROM kct.kct_navires_appareilles ORDER BY date_rapport DESC LIMIT 1000`),
    query(`SELECT * FROM kct.kct_navires_operation ORDER BY date_rapport DESC LIMIT 20`),
    query(`SELECT * FROM kct.kct_operations_escales ORDER BY date_rapport DESC LIMIT 20`),
    query(`SELECT * FROM kct.kct_parc_conteneurs ORDER BY date_rapport DESC LIMIT 120`),
    query(`SELECT * FROM kct.kct_rapport_quotidien ORDER BY date_rapport DESC LIMIT 120`),
    query(`SELECT * FROM kct.kct_kpis ORDER BY date_rapport DESC LIMIT 120`),
  ]);

  const filterOptions = {
    years: (yearsRes.rows || []).map((row) => asNumber(row.annee)),
    months: (monthsRes.rows || []).map((row) => ({
      num: asNumber(row.mois_num),
      name: asText(row.mois_nom_fr),
    })),
    shippingLines: getUniqueShippingOptions(
      (shippingRes.rows || []).map((row) => asText(row.shipping)),
    ),
  };

  const initialData = {
    dailyData: (dailyRes.rows || []).reverse(),
    naviresPerformance: performanceRes.rows || [],
    monthlyData: (monthlyRes.rows || []).reverse(),
    gateData: (gateRes.rows || []).reverse(),
    armateursData: (armateursRes.rows || []).reverse(),
    exploitantsData: (exploitantsRes.rows || []).reverse(),
    naviresAttendus: naviresAttendusRes.rows || [],
    naviresAppareilles: naviresAppareillesRes.rows || [],
    naviresOperation: naviresOperationRes.rows || [],
    operationsEscales: operationsEscalesRes.rows || [],
    parcConteneurs: (parcConteneursRes.rows || []).reverse(),
    rapportQuotidien: (rapportQuotidienRes.rows || []).reverse(),
    kpisData: (kpisRes.rows || []).reverse(),
  };

  return <DashboardClient filterOptions={filterOptions} initialData={initialData} />;
}
