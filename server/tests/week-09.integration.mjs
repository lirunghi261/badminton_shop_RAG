import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { test } from "node:test";
import mongoose from "mongoose";

const uri = process.env.TEST_MONGODB_URI;
assert.ok(uri, "Set TEST_MONGODB_URI to an isolated MongoDB replica set.");
process.env.NODE_ENV = "test";
process.env.MONGODB_URI = uri;
process.env.JWT_ACCESS_SECRET = randomUUID();
process.env.JWT_REFRESH_SECRET = randomUUID();

test("Week 9 COD backend", async (t) => {
  const dbName = `test_week09_${randomUUID().replaceAll("-", "")}`;
  await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 5000 });
  t.after(async () => {
    try {
      assert.equal(mongoose.connection.name, dbName);
      await mongoose.connection.dropDatabase();
    } finally {
      await mongoose.disconnect();
    }
  });

  const { app } = await import("../dist/app.js");
  const { createAccessToken } = await import("../dist/modules/auth/auth.tokens.js");
  const { UserModel } = await import("../dist/modules/users/user.model.js");
  const { BrandModel } = await import("../dist/modules/brands/brand.model.js");
  const { CategoryModel } = await import("../dist/modules/categories/category.model.js");
  const { ProductModel } = await import("../dist/modules/products/product.model.js");
  const { OrderModel } = await import("../dist/modules/orders/order.model.js");
  const [first, second, admin] = await UserModel.create([
    { name: "First Customer", email: "first@example.test", password: "fixture-password", role: "customer" },
    { name: "Second Customer", email: "second@example.test", password: "fixture-password", role: "customer" },
    { name: "Test Admin", email: "admin@example.test", password: "fixture-password", role: "admin" },
  ]);
  const category = await CategoryModel.create({ name: "Category", slug: "week09-category", status: "active" });
  const brand = await BrandModel.create({ name: "Brand", slug: "week09-brand", status: "active" });

  const variant = (sku, stock, salePrice) => ({ sku, stock, salePrice, colorName: sku });
  const product = (slug, variants, status = "active") => ProductModel.create({
    name: slug, slug, category: category._id, brand: brand._id, status,
    basePrice: 100000, salePrice: 90000, images: [], variants,
  });
  const line = (item, sku, quantity = 1) => ({ productId: item.id, sku, quantity });
  const stock = async (item, sku) => (await ProductModel.findById(item.id)).variants.find((entry) => entry.sku === sku).stock;
  const payload = (...items) => ({
    customer: { fullName: "Người nhận hàng", phone: "0901234567" },
    shippingAddress: { addressLine: "123 Đường Số 1, TP. Hồ Chí Minh" },
    items,
    paymentMethod: "cod",
  });

  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  async function request(path, { method = "GET", user, body, key } = {}) {
    const headers = {};
    if (user) {
      const cookie = user.role === "admin" ? "accessToken" : "customerAccessToken";
      headers.Cookie = `${cookie}=${createAccessToken(user.id, user.role)}`;
    }
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (key) headers["Idempotency-Key"] = key;
    const response = await fetch(base + path, { method, headers, body: JSON.stringify(body) });
    return { status: response.status, ...(await response.json()) };
  }
  const create = (user, body, key = randomUUID()) => request("/customer/orders", { method: "POST", user, body, key });
  const cancel = (id) => request(`/admin/orders/${id}/status`, {
    method: "PATCH", user: admin, body: { status: "cancelled", note: "Khách yêu cầu hủy" },
  });

  await t.test("validates identity, payment, server-controlled amounts and catalog availability", async () => {
    const item = await product("available", [variant("W09-A", 4)]);
    const hidden = await product("hidden", [variant("W09-HIDDEN", 4)], "inactive");
    const body = payload(line(item, "W09-A"));
    assert.equal((await create(undefined, body)).status, 401);
    assert.equal((await create(admin, body)).status, 401);
    assert.equal((await create(first, body, "")).status, 400);
    assert.equal((await create(first, { ...body, total: 1 })).error.code, "VALIDATION_ERROR");
    assert.equal((await create(first, { ...body, items: [{ ...body.items[0], unitPrice: 1 }] })).status, 400);
    assert.equal((await create(first, { ...body, paymentMethod: "bank_transfer" })).error.code, "UNSUPPORTED_PAYMENT_METHOD");
    assert.equal((await create(first, payload(line(hidden, "W09-HIDDEN")))).error.code, "PRODUCT_UNAVAILABLE");
    assert.equal((await create(first, payload(line(item, "W09-HIDDEN")))).error.code, "PRODUCT_UNAVAILABLE");
    await BrandModel.updateOne({ _id: brand.id }, { status: "inactive" });
    assert.equal((await create(first, body)).error.code, "PRODUCT_UNAVAILABLE");
    await BrandModel.updateOne({ _id: brand.id }, { status: "active" });
    assert.equal(await stock(item, "W09-A"), 4);
  });

  await t.test("concurrent retries charge live prices and create only one order per customer and key", async () => {
    const item = await product("retries", [variant("W09-B", 4), variant("W09-FREE", 4, 0)]);
    const paid = line(item, "W09-B");
    const free = line(item, "W09-FREE");
    const key = randomUUID();
    const requests = await Promise.all([
      create(first, payload(paid, free, paid), key),
      create(first, payload(free, { ...paid, quantity: 2 }), key),
    ]);
    assert.deepEqual(requests.map((response) => response.status).sort(), [200, 201]);
    const [{ data: { order } }] = requests;
    assert.equal(requests[1].data.order.id, order.id);
    assert.equal(order.total, 180000);
    assert.equal(order.items.find((entry) => entry.sku === free.sku).unitPrice, 0);
    assert.ok(order.items.every((entry) => entry.variantId));
    assert.equal(await stock(item, paid.sku), 2);
    assert.equal(await stock(item, free.sku), 3);
    assert.equal((await create(first, payload(paid), key)).error.code, "IDEMPOTENCY_CONFLICT");
    assert.equal((await create(second, payload(paid), key)).status, 201);

    const adminOrder = await request(`/admin/orders/${order.id}`, { user: admin });
    assert.equal(adminOrder.data.order.source, "checkout");
    await request(`/admin/orders/${order.id}/admin-note`, {
      method: "PATCH", user: admin, body: { adminNote: "Nội bộ" },
    });
    const own = await request(`/customer/orders/${order.id}`, { user: first });
    assert.equal(own.status, 200);
    for (const field of ["adminNote", "requestHash", "idempotencyKey", "statusHistory"]) {
      assert.ok(!(field in own.data.order), field);
    }
    assert.equal((await request(`/customer/orders/${order.id}`, { user: second })).status, 404);
    const page = await request("/customer/orders?limit=1", { user: second });
    assert.equal(page.data.pagination.total, 1);
    assert.notEqual(page.data.orders[0].id, order.id);
  });

  await t.test("last SKU is sold once and repeated Admin cancellation restores it once", async () => {
    const item = await product("last-stock", [variant("W09-LAST", 1)]);
    const body = payload(line(item, "W09-LAST"));
    const attempts = await Promise.all([create(first, body), create(second, body)]);
    assert.deepEqual(attempts.map((response) => response.status).sort(), [201, 409]);
    assert.equal(attempts.find((response) => response.status === 409).error.code, "OUT_OF_STOCK");
    assert.equal(await stock(item, "W09-LAST"), 0);
    const id = attempts.find((response) => response.status === 201).data.order.id;
    const cancellations = await Promise.all([cancel(id), cancel(id)]);
    assert.deepEqual(cancellations.map((response) => response.status), [200, 200]);
    assert.equal(await stock(item, "W09-LAST"), 1);
    const stored = await OrderModel.findById(id);
    assert.equal(stored.statusHistory.filter((entry) => entry.to === "cancelled").length, 1);
  });

  await t.test("a failure after a stock update rolls back both stock and the new order", async () => {
    const item = await product("rollback", [variant("W09-R1", 3), variant("W09-R2", 3)]);
    const updateOne = ProductModel.updateOne;
    const orderCount = await OrderModel.countDocuments();
    ProductModel.updateOne = function (filter, ...args) {
      if (filter.variants?.$elemMatch?.sku === "W09-R2") return Promise.resolve({ matchedCount: 0 });
      return updateOne.call(this, filter, ...args);
    };
    try {
      const result = await create(first, payload(line(item, "W09-R1"), line(item, "W09-R2")));
      assert.equal(result.error.code, "OUT_OF_STOCK");
      assert.equal(await OrderModel.countDocuments(), orderCount);
      assert.equal(await stock(item, "W09-R1"), 3);
    } finally {
      ProductModel.updateOne = updateOne;
    }
  });

  await t.test("cancellation rolls back if a reserved SKU is missing", async () => {
    const item = await product("missing-sku", [variant("W09-C1", 3), variant("W09-C2", 3)]);
    const result = await create(first, payload(line(item, "W09-C1"), line(item, "W09-C2")));
    const id = result.data.order.id;
    await ProductModel.updateOne({ _id: item.id }, { $pull: { variants: { sku: "W09-C2" } } });
    const cancelled = await cancel(id);
    assert.equal(cancelled.status, 409);
    assert.equal(cancelled.error.code, "RESTOCK_SKU_UNAVAILABLE");
    assert.equal(await stock(item, "W09-C1"), 2);
    assert.equal((await OrderModel.findById(id)).status, "pending");
  });
});
