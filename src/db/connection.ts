import { Client, type ClientConfig, Pool } from "pg";

/** Parse URLs explicitly so ambient PG* options cannot weaken the chosen TLS target. */
export function databaseClientConfig(
  value: string,
): ClientConfig & { bindingRequired: boolean } {
  const url = new URL(value);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !url.hostname ||
    url.hash ||
    url.hostname.includes(",")
  )
    throw new Error("Unsupported database address");
  if (!/^[a-z0-9.-]+\.neon\.tech$/.test(url.hostname))
    throw new Error("Expected a Neon database endpoint");
  for (const [key, option] of url.searchParams)
    if (
      !(
        (key === "sslmode" && ["require", "verify-full"].includes(option)) ||
        (key === "channel_binding" && option === "require")
      )
    )
      throw new Error("Unsupported database option");
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 5432,
    database: decodeURIComponent(url.pathname.slice(1)),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    ssl: { rejectUnauthorized: true, servername: url.hostname },
    enableChannelBinding: true,
    bindingRequired: url.searchParams.get("channel_binding") === "require",
    connectionTimeoutMillis: 20_000,
    application_name: "myreiki",
  };
}

class BoundClient extends Client {
  bindingOffered = false;
  bindingRequired = false;
  constructor(config?: ClientConfig) {
    super(config);
    const connection = (
      this as unknown as {
        connection: {
          on: (
            event: string,
            handler: (message: { mechanisms: string[] }) => void,
          ) => void;
        };
      }
    ).connection;
    connection.on("authenticationSASL", (message) => {
      this.bindingOffered = message.mechanisms.includes("SCRAM-SHA-256-PLUS");
    });
  }
}

/** Pool admission checks channel-binding negotiation before any application query. */
export function createDatabasePool(value: string | (() => string)) {
  class ConfiguredClient extends BoundClient {
    constructor() {
      const { bindingRequired, ...config } = databaseClientConfig(
        typeof value === "function" ? value() : value,
      );
      super(config);
      this.bindingRequired = bindingRequired;
    }
  }
  const pool = new Pool({
    Client: ConfiguredClient,
    max: 5,
    idleTimeoutMillis: 30_000,
    verify: (client, done) => {
      const bound = client as unknown as BoundClient;
      done(
        bound.bindingRequired && !bound.bindingOffered
          ? new Error("Required database channel binding unavailable")
          : undefined,
      );
    },
  });
  // Neon restarts and credential changes can close idle clients. pg has
  // already removed that client; an unhandled event would crash the process.
  pool.on("error", () => {
    console.warn(
      "An idle database connection closed; the pool will reconnect.",
    );
  });
  return pool;
}
