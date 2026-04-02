import DashboardClient from "@/components/DashboardClient";
import { queryWithClient, withClient } from "@/lib/db";
import { getUniqueShippingOptions } from "@/lib/shipping";

export const dynamic = "force-dynamic";

function asNumber(value: unknown): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

export default async function Page() {
  try {
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
    ] = await withClient(async (client) => {
      return [
        await queryWithClient(
          client,
          `SELECT DISTINCT annee FROM kct.dim_date WHERE annee IS NOT NULL ORDER BY annee DESC`,
        ),
        await queryWithClient(
          client,
          `SELECT DISTINCT mois_num, mois_nom_fr FROM kct.dim_date WHERE mois_num IS NOT NULL ORDER BY mois_num ASC`,
        ),
        await queryWithClient(
          client,
          `SELECT DISTINCT shipping FROM kct.v_navires_performance WHERE shipping IS NOT NULL ORDER BY shipping ASC`,
        ),
        await queryWithClient(client, `SELECT * FROM kct.v_kct_daily ORDER BY date_rapport DESC LIMIT 400`),
        await queryWithClient(
          client,
          `SELECT * FROM kct.v_navires_performance ORDER BY date_rapport DESC LIMIT 1000`,
        ),
        await queryWithClient(
          client,
          `SELECT * FROM kct.v_kct_monthly ORDER BY annee DESC, mois_num DESC LIMIT 18`,
        ),
        await queryWithClient(client, `SELECT * FROM kct.kct_gate_ttt ORDER BY date_rapport DESC LIMIT 400`),
        await queryWithClient(
          client,
          `SELECT * FROM kct.kct_escales_armateurs ORDER BY date_rapport DESC LIMIT 20`,
        ),
        await queryWithClient(
          client,
          `SELECT * FROM kct.kct_exploitants_parc ORDER BY date_rapport DESC LIMIT 20`,
        ),
        await queryWithClient(
          client,
          `SELECT * FROM kct.kct_navires_attendus ORDER BY date_rapport DESC LIMIT 10`,
        ),
        await queryWithClient(
          client,
          `SELECT * FROM kct.kct_navires_appareilles ORDER BY date_rapport DESC LIMIT 1000`,
        ),
        await queryWithClient(
          client,
          `SELECT * FROM kct.kct_navires_operation ORDER BY date_rapport DESC LIMIT 20`,
        ),
        await queryWithClient(
          client,
          `SELECT * FROM kct.kct_operations_escales ORDER BY date_rapport DESC LIMIT 20`,
        ),
        await queryWithClient(
          client,
          `SELECT * FROM kct.kct_parc_conteneurs ORDER BY date_rapport DESC LIMIT 120`,
        ),
        await queryWithClient(
          client,
          `SELECT * FROM kct.kct_rapport_quotidien ORDER BY date_rapport DESC LIMIT 120`,
        ),
        await queryWithClient(client, `SELECT * FROM kct.kct_kpis ORDER BY date_rapport DESC LIMIT 120`),
      ];
    });

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
  } catch (error) {
    console.error("Failed to render dashboard page:", error);

    return (
      <DashboardClient
        filterOptions={{ years: [], months: [], shippingLines: [] }}
        initialData={{
          dailyData: [],
          naviresPerformance: [],
          monthlyData: [],
          gateData: [],
          armateursData: [],
          exploitantsData: [],
          naviresAttendus: [],
          naviresAppareilles: [],
          naviresOperation: [],
          operationsEscales: [],
          parcConteneurs: [],
          rapportQuotidien: [],
          kpisData: [],
        }}
        serverError="Connexion a la base de donnees indisponible. Le tableau de bord est charge en mode degrade."
      />
    );
  }
}
