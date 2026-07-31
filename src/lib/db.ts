import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";

/**
 * Accès PostgreSQL mutualisé.
 *
 * Une connexion par requête (ancien comportement) coûtait un aller-retour TLS
 * complet à chaque appel et saturait le nombre de connexions autorisées sous
 * charge. Le pool est conservé entre les invocations, y compris à travers les
 * rechargements du serveur de développement.
 */

declare global {
  var __portPulsePool: Pool | undefined;
}

function getConnectionString(): string {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL manquant. Configurez la variable d'environnement avant d'utiliser la base.",
    );
  }
  return connectionString;
}

/**
 * Taille du pool.
 *
 * En environnement serverless (Vercel), chaque instance de fonction détient son
 * propre pool. Avec N instances actives simultanément, la base voit N × max
 * connexions. Heroku Postgres plafonne selon le plan (20 sur les petits plans) :
 * un pool trop large provoque des « too many connections » sous charge, alors
 * même que chaque requête est rapide.
 *
 * On reste donc volontairement bas, et surchargeable si le plan le permet.
 */
function getPoolSize(): number {
  const configured = Number(process.env.DATABASE_POOL_MAX);
  if (Number.isFinite(configured) && configured > 0) return Math.trunc(configured);
  return process.env.VERCEL ? 3 : 8;
}

function createPool(): Pool {
  const pool = new Pool({
    connectionString: getConnectionString(),
    max: getPoolSize(),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: { rejectUnauthorized: false },
  });

  // Un client inactif qui tombe ne doit jamais faire chuter le processus.
  pool.on("error", (error) => {
    console.error("Erreur sur un client PostgreSQL inactif:", error.message);
  });

  return pool;
}

export function getPool(): Pool {
  if (!global.__portPulsePool) {
    global.__portPulsePool = createPool();
  }
  return global.__portPulsePool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: readonly unknown[],
): Promise<QueryResult<T>> {
  const start = Date.now();
  const result = await getPool().query<T>(text, params as unknown[]);
  logQuery(text, start, result.rowCount);
  return result;
}

/**
 * Exécute plusieurs requêtes indépendantes en parallèle sur le pool.
 * Le chargement initial du cockpit coûtait la somme de 13 latences ; il coûte
 * désormais la plus longue d'entre elles.
 */
export async function queryAll<T extends QueryResultRow = QueryResultRow>(
  statements: ReadonlyArray<{ text: string; params?: readonly unknown[] }>,
): Promise<Array<QueryResult<T>>> {
  return Promise.all(statements.map(({ text, params }) => query<T>(text, params)));
}

/** Pour les enchaînements devant partager une même session (SET, transaction). */
export async function withClient<T>(
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    return await callback(client);
  } finally {
    client.release();
  }
}

export async function queryWithClient<T extends QueryResultRow = QueryResultRow>(
  client: PoolClient,
  text: string,
  params?: readonly unknown[],
): Promise<QueryResult<T>> {
  const start = Date.now();
  const result = await client.query<T>(text, params as unknown[]);
  logQuery(text, start, result.rowCount);
  return result;
}

function logQuery(text: string, start: number, rows: number | null) {
  if (process.env.NODE_ENV === "production") return;
  const duration = Date.now() - start;
  const compact = text.replace(/\s+/g, " ").trim().slice(0, 110);
  console.log(`[sql] ${duration}ms · ${rows ?? 0} lignes · ${compact}`);
}
