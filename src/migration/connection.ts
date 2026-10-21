import { Client } from "pg";

/** Restricted direct Neon connection with certificate identity and required channel binding. */
export async function connectImportDatabase(
  value: string,
  expectedHost: string,
) {
  const url = new URL(value);
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:")
    throw new Error("Unsupported database protocol");
  if (
    url.hostname !== expectedHost ||
    !/^[a-z0-9-]+\.c-\d+\.ap-southeast-1\.aws\.neon\.tech$/.test(
      expectedHost,
    ) ||
    expectedHost.includes("pooler")
  )
    throw new Error(
      "Import endpoint does not match the approved direct Singapore endpoint",
    );
  if (url.port && url.port !== "5432")
    throw new Error("Unexpected database port");
  for (const [key, option] of url.searchParams) {
    if (
      !(
        (key === "sslmode" && option === "require") ||
        (key === "channel_binding" && option === "require")
      )
    )
      throw new Error("Unsupported database connection option");
  }
  let offersBinding = false;
  const client = new Client({
    host: expectedHost,
    port: 5432,
    database: decodeURIComponent(url.pathname.slice(1)),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    ssl: { rejectUnauthorized: true, servername: expectedHost },
    enableChannelBinding: true,
    connectionTimeoutMillis: 20_000,
    query_timeout: 90_000,
    application_name: "myreiki-protected-import",
  });
  // pg chooses PLUS first when enabled and offered over TLS. Check the actual
  // handshake before issuing any SQL, rather than silently treating require as prefer.
  const connection = (
    client as unknown as {
      connection: {
        on: (
          name: string,
          handler: (message: { mechanisms: string[] }) => void,
        ) => void;
      };
    }
  ).connection;
  connection.on("authenticationSASL", (message) => {
    offersBinding = message.mechanisms.includes("SCRAM-SHA-256-PLUS");
  });
  try {
    await client.connect();
    if (!offersBinding)
      throw new Error("Database did not offer required SCRAM channel binding");
    const {
      rows: [identity],
    } = await client.query(
      "select current_database() as database, current_user as role",
    );
    if (
      identity.database !== decodeURIComponent(url.pathname.slice(1)) ||
      identity.role !== decodeURIComponent(url.username)
    )
      throw new Error("Database identity mismatch");
    return client;
  } catch (error) {
    await client.end();
    throw error;
  }
}
