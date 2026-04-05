import { Client, QueryResult, QueryResultRow } from "pg";

function getConnectionString() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL manquant. Configurez la variable d'environnement avant d'utiliser la base.");
  }
  return connectionString;
}

function createClient() {
  return new Client({
    connectionString: getConnectionString(),
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
