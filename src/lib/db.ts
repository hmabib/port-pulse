import { Client, QueryResult, QueryResultRow } from "pg";

const connectionString =
  process.env.DATABASE_URL ||
  "postgres://ubu9t49cgs8sks:p766560eb47630f600a95195c4d49a525d64a1b940f98ba3868f0b40d55538f3e@c3hsmn51hjafhh.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/d3tkprud8d3nb9";

function createClient() {
  return new Client({
    connectionString,
    connectionTimeoutMillis: 10_000,
    ssl: {
      rejectUnauthorized: false,
    },
  });
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: readonly unknown[],
): Promise<QueryResult<T>> {
  return withClient((client) => queryWithClient(client, text, params));
}

export async function withClient<T>(
  callback: (client: Client) => Promise<T>,
): Promise<T> {
  const client = createClient();
  await client.connect();

  try {
    return await callback(client);
  } finally {
    await client.end();
  }
}

export async function queryWithClient<T extends QueryResultRow = QueryResultRow>(
  client: Client,
  text: string,
  params?: readonly unknown[],
): Promise<QueryResult<T>> {
  const start = Date.now();
  const res = await client.query<T>(text, params as unknown[]);
  const duration = Date.now() - start;
  console.log("executed query", { text, duration, rows: res.rowCount });
  return res;
}
