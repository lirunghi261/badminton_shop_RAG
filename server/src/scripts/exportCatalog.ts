import "dotenv/config";
import { randomUUID } from "node:crypto";
import { rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import mongoose from "mongoose";
import { buildCatalogExport } from "../modules/catalog/catalog-export.js";
import { listCatalogProducts } from "../modules/catalog/catalog.service.js";

try {
  const { values: { output } } = parseArgs({ options: { output: { type: "string" } } });
  if (!output?.trim()) {
    throw new Error("Usage: npm run catalog:export -- --output <catalog.json>");
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required.");

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  const snapshot = buildCatalogExport(await listCatalogProducts());
  const destination = resolve(process.env.INIT_CWD ?? process.cwd(), output);
  const temporary = `${destination}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, JSON.stringify(snapshot, null, 2) + "\n", "utf8");
    await rename(temporary, destination);
  } finally {
    await rm(temporary, { force: true });
  }

  console.log(`Exported ${snapshot.productCount} public products (${snapshot.datasetVersion}) to ${destination}`);
} catch (error) {
  const message = error instanceof mongoose.Error.MongooseServerSelectionError
    ? "Could not connect to MongoDB."
    : error instanceof Error ? error.message.replace(/mongodb(?:\+srv)?:\/\/\S+/gi, "[redacted]") : "Unknown error.";
  console.error(`Catalog export failed: ${message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
