import fs from "node:fs/promises";
import { resolve } from "node:path";
import { env } from "../config/env.js";
import mongoose from "mongoose";
import { listCatalogProducts } from "../modules/catalog/catalog.service.js";
import { planRagSync } from "../modules/rag/rag-document.js";

try {
  const args = process.argv.slice(2);
  const outputIndex = args.indexOf("--output");
  let output: string | undefined;
  if (outputIndex !== -1) {
    output = args[outputIndex + 1];
    if (!output) throw new Error("Missing output path");
    args.splice(outputIndex, 2);
  }
  if (args.length > 1 || args.some((arg) => arg.startsWith("--"))) throw new Error("Usage: rag:plan [previous-plan.json] [--output next-plan.json]");
  if (args[0] && output && resolve(args[0]) === resolve(output)) throw new Error("Input and output paths must differ");
  const previous = args[0] ? JSON.parse((await fs.readFile(args[0], "utf8")).replace(/^\uFEFF/, "")) : { documents: [] };
  if (!Array.isArray(previous.documents)) throw new Error("Previous plan must contain documents array");
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
  const products = await listCatalogProducts();
  const json = JSON.stringify(planRagSync(products, previous.documents), null, 2) + "\n";
  if (output) await fs.writeFile(output, json, "utf8");
  else process.stdout.write(json);
} catch {
  console.error("Unable to build complete RAG sync plan; no index changes applied.");
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
