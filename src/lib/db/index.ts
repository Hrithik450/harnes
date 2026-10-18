import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../drizzle/schema";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

const globalForDb = globalThis as unknown as {
  pgPool: Pool | undefined;
};

const pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString: connectionString || "",
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgPool = pool;
}

export const db = drizzle(pool, { schema });
