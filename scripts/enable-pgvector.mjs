import "dotenv/config";
import pg from "pg";

const url =
  process.env.WELLNESSBOX_URL_NON_POOLING ||
  process.env.RAG_DATABASE_URL ||
  process.env.WELLNESSBOX_PRISMA_URL;

if (!url) {
  console.error("NO_DB_URL");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
await client.query("CREATE EXTENSION IF NOT EXISTS vector");
await client.end();
console.log("OK");
