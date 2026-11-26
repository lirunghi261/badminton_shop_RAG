import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import mongoose from "mongoose";
import { getPublicProductBySlug } from "../dist/modules/products/products.service.js";

const exec = promisify(execFile);
const uri = process.env.TEST_MONGODB_URI;
assert.ok(uri, "Set TEST_MONGODB_URI to an isolated MongoDB server.");

test("Week 10 catalog export", async (t) => {
  const dbName = `test_week10_${randomUUID().replaceAll("-", "")}`;
  await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 5000, autoIndex: false, autoCreate: false });
  t.after(async () => {
    try {
      assert.equal(mongoose.connection.name, dbName);
      await mongoose.connection.dropDatabase();
    } finally {
      await mongoose.disconnect();
    }
  });
  const { db } = mongoose.connection;
  const products = db.collection("products");
  const lookups = async (collection) => {
    const { insertedIds } = await db.collection(collection).insertMany([
      { slug: `active-${collection}`, name: "Active", status: "active" },
      { slug: `inactive-${collection}`, name: "Inactive", status: "inactive" },
      { slug: `deleted-${collection}`, name: "Deleted", status: "active", deletedAt: new Date() },
    ]);
    return [insertedIds[0], insertedIds[1], insertedIds[2], new mongoose.Types.ObjectId()];
  };
  const [category, inactiveCategory, deletedCategory, missingCategory] = await lookups("categories");
  const [brand, inactiveBrand, deletedBrand, missingBrand] = await lookups("brands");
  const item = (slug, fields) => ({
    name: slug, slug, category, brand, status: "active", basePrice: 100000, images: [],
    variants: [{ sku: slug.toUpperCase(), colorName: "Đen", stock: 3 }],
    ...fields,
  });
  const { insertedIds } = await products.insertMany([
    item("public-product", { description: "<p>Vợt thử nghiệm &amp; phụ kiện.</p>" }),
    item("sold-out", { variants: [{ sku: "SOLD-OUT", colorName: "Đen", stock: 0 }] }),
    item("public-third", { deletedAt: null }),
    item("public-fourth", { deletedAt: null }),
    item("draft", { status: "draft" }),
    item("inactive", { status: "inactive" }),
    item("deleted", { deletedAt: new Date() }),
    item("inactive-category", { category: inactiveCategory }),
    item("deleted-category", { category: deletedCategory }),
    item("missing-category", { category: missingCategory }),
    item("inactive-brand", { brand: inactiveBrand }),
    item("deleted-brand", { brand: deletedBrand }),
    item("missing-brand", { brand: missingBrand }),
  ]);
  const publicId = insertedIds[0];
  const directory = await mkdtemp(join(tmpdir(), "week10-catalog-"));
  const output = join(directory, "catalog.json");
  t.after(async () => {
    await rm(output, { force: true });
    await rmdir(directory);
  });
  const script = fileURLToPath(new URL("../dist/scripts/exportCatalog.js", import.meta.url));
  const databaseUri = new URL(uri);
  if (databaseUri.username && !databaseUri.searchParams.has("authSource")) {
    databaseUri.searchParams.set("authSource", databaseUri.pathname.slice(1) || "admin");
  }
  databaseUri.pathname = `/${dbName}`;
  const exportCatalog = () => exec(process.execPath, [script, "--output", output], {
    env: { ...process.env, MONGODB_URI: databaseUri.toString() },
  });
  const readExport = async () => {
    await exportCatalog();
    return readFile(output, "utf8");
  };

  let original;
  await t.test("exports the full public catalog with traceable product and SKU IDs", async () => {
    original = await readExport();
    const { schemaVersion, datasetVersion, productCount, products: records } = JSON.parse(original);
    assert.equal(schemaVersion, 1);
    assert.equal(datasetVersion, createHash("sha256").update(JSON.stringify({ schemaVersion, products: records })).digest("hex"));
    assert.equal(productCount, 4);
    assert.deepEqual(records.map(({ slug }) => slug), ["public-product", "sold-out", "public-third", "public-fourth"]);
    const [record] = records;
    assert.equal(record.productId, publicId.toHexString());
    assert.equal(record.brandId, brand.toHexString());
    assert.equal(record.categoryId, category.toHexString());
    assert.equal(record.sourceUrl, "/products/public-product");
    assert.equal((await getPublicProductBySlug(record.slug)).id, record.productId);
    assert.match(record.description, /^Vợt thử nghiệm.*phụ kiện\.$/u);
    assert.doesNotMatch(record.description, /<\/?p>/u);
    assert.deepEqual(record.variants, [{ sku: "PUBLIC-PRODUCT", colorName: "Đen", attributes: [] }]);
  });

  await t.test("keeps the export unchanged after a live price or stock adjustment", async () => {
    await products.updateOne({ _id: publicId }, {
      $set: { basePrice: 200000, "variants.0.stock": 0, updatedAt: new Date() },
    });
    assert.equal(await readExport(), original);
  });

  await t.test("uses the same identity and a fresh path and version after a slug change", async () => {
    await products.updateOne({ _id: publicId }, { $set: { slug: "renamed-product" } });
    const snapshot = JSON.parse(await readExport());
    assert.notEqual(snapshot.datasetVersion, JSON.parse(original).datasetVersion);
    assert.equal(snapshot.products[0].productId, publicId.toHexString());
    assert.equal(snapshot.products[0].sourceUrl, "/products/renamed-product");
    assert.equal((await getPublicProductBySlug("renamed-product")).id, publicId.toHexString());
  });

  await t.test("preserves the last export when source identities would be ambiguous", async () => {
    const before = await readFile(output, "utf8");
    await products.insertOne(item("renamed-product", { variants: [] }));
    await assert.rejects(exportCatalog(), { code: 1, stderr: /Duplicate catalog identity/ });
    assert.equal(await readFile(output, "utf8"), before);
  });
});
