import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

const ALLOWED_TABLES = [
  'dim_date',
  'kct_escales_armateurs',
  'kct_exploitants_parc',
  'kct_gate_ttt',
  'kct_kpis',
  'kct_navires_appareilles',
  'kct_navires_attendus',
  'kct_navires_operation',
  'kct_operations_escales',
  'kct_parc_conteneurs',
  'kct_rapport_quotidien',
  'kct_volumes_teu',
  'v_kct_daily',
  'v_kct_monthly',
  'v_kct_weekly',
  'v_navires_performance'
];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ table: string }> }
) {
  const { table } = await params;

  if (!ALLOWED_TABLES.includes(table)) {
    return NextResponse.json({ error: 'Invalid table or view name' }, { status: 400 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limitParams = searchParams.get('limit');
    let limit = 100; // default limit
    
    if (limitParams && !isNaN(Number(limitParams))) {
      limit = Number(limitParams);
    }

    const orderBy = searchParams.get('orderBy');
    const orderDir = searchParams.get('orderDir') === 'ASC' ? 'ASC' : 'DESC';

    let queryText = `SELECT * FROM kct.${table}`;
    if (orderBy) {
       // extremely simple whitelist check if we want, but since it's an internal dashboard we just sanitize with basic checks
       const safeOrderBy = orderBy.replace(/[^a-zA-Z0-9_]/g, '');
       queryText += ` ORDER BY ${safeOrderBy} ${orderDir}`;
    }
    
    queryText += ` LIMIT $1`;

    const result = await query(queryText, [limit]);
    return NextResponse.json({ data: result.rows });
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
