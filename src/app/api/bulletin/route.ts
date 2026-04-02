import { NextResponse } from "next/server";
import { query } from "@/lib/db";

const DELETE_PASSWORD = "psg";

// All tables that reference rapport_id
const CHILD_TABLES = [
  "kct.kct_volumes_teu",
  "kct.kct_escales_armateurs",
  "kct.kct_parc_conteneurs",
  "kct.kct_gate_ttt",
  "kct.kct_kpis",
  "kct.kct_navires_appareilles",
  "kct.kct_navires_attendus",
  "kct.kct_navires_operation",
  "kct.kct_operations_escales",
  "kct.kct_exploitants_parc",
];

/** GET: List all bulletins (rapport_quotidien) with duplicate detection */
export async function GET() {
  try {
    const result = await query(
      `SELECT r.rapport_id, r.date_rapport, r.document_numero, r.source_fichier,
              r.nb_navires_appareilles, r.nb_navires_en_operation, r.nb_navires_attendus,
              r.created_at,
              COUNT(*) OVER (PARTITION BY r.date_rapport) as date_count
       FROM kct.kct_rapport_quotidien r
       ORDER BY r.date_rapport DESC, r.created_at DESC`,
      [],
    );
    return NextResponse.json({ data: result.rows });
  } catch (error) {
    console.error("Bulletin list error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/** DELETE: Remove a specific bulletin by rapport_id (requires password) */
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { rapportId, password } = body;

    if (!rapportId) {
      return NextResponse.json({ error: "rapport_id requis" }, { status: 400 });
    }

    if (password !== DELETE_PASSWORD) {
      return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 403 });
    }

    // Delete from all child tables first, then master
    for (const table of CHILD_TABLES) {
      await query(`DELETE FROM ${table} WHERE rapport_id = $1`, [rapportId]);
    }

    const result = await query(
      `DELETE FROM kct.kct_rapport_quotidien WHERE rapport_id = $1 RETURNING date_rapport`,
      [rapportId],
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Bulletin introuvable" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Bulletin du ${result.rows[0].date_rapport} supprime`,
    });
  } catch (error) {
    console.error("Bulletin delete error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
