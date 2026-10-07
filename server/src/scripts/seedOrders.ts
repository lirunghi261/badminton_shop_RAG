import { Types } from "mongoose";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { OrderModel, type OrderStatus, type PaymentStatus } from "../modules/orders/order.model.js";
import { ProductModel, type ProductVariant } from "../modules/products/product.model.js";
import { UserModel } from "../modules/users/user.model.js";

const customers = [
  { fullName: "Nguyễn Minh Anh", phone: "0901234567", email: "minhanh@example.com", province: "TP. Hồ Chí Minh", district: "Quận 3", ward: "Phường Võ Thị Sáu", addressLine: "128 Nguyễn Đình Chiểu" },
  { fullName: "Trần Quốc Huy", phone: "0912345678", email: "quochuy@example.com", province: "Hà Nội", district: "Cầu Giấy", ward: "Phường Dịch Vọng", addressLine: "46 Trần Thái Tông" },
  { fullName: "Lê Hoàng Nam", phone: "0933456789", email: "hoangnam@example.com", province: "Đà Nẵng", district: "Hải Châu", ward: "Phường Thạch Thang", addressLine: "72 Quang Trung" },
  { fullName: "Phạm Thảo Vy", phone: "0984567890", email: "thaovy@example.com", province: "Cần Thơ", district: "Ninh Kiều", ward: "Phường An Khánh", addressLine: "19 Nguyễn Văn Cừ" },
  { fullName: "Võ Gia Bảo", phone: "0975678901", email: "giabao@example.com", province: "Bình Dương", district: "Thủ Dầu Một", ward: "Phường Phú Lợi", addressLine: "205 Đại lộ Bình Dương" },
  { fullName: "Đặng Ngọc Mai", phone: "0966789012", email: "ngocmai@example.com", province: "Đồng Nai", district: "Biên Hòa", ward: "Phường Tân Phong", addressLine: "33 Đồng Khởi" },
];

const sampleStatuses: Array<{ status: OrderStatus; paymentStatus: PaymentStatus }> = [
  { status: "pending", paymentStatus: "unpaid" },
  { status: "confirmed", paymentStatus: "pending" },
  { status: "processing", paymentStatus: "paid" },
  { status: "shipping", paymentStatus: "paid" },
  { status: "completed", paymentStatus: "paid" },
  { status: "cancelled", paymentStatus: "failed" },
  { status: "pending", paymentStatus: "unpaid" },
  { status: "confirmed", paymentStatus: "paid" },
  { status: "processing", paymentStatus: "pending" },
  { status: "shipping", paymentStatus: "paid" },
  { status: "completed", paymentStatus: "paid" },
  { status: "cancelled", paymentStatus: "refunded" },
];

function progressionFor(status: OrderStatus): OrderStatus[] {
  if (status === "cancelled") return ["pending", "cancelled"];
  const flow: OrderStatus[] = ["pending", "confirmed", "processing", "shipping", "completed"];
  return flow.slice(0, flow.indexOf(status) + 1);
}

function variantLabel(variant: ProductVariant) {
  const attributes = variant.attributes.map((attribute) => attribute.value).filter(Boolean);
  return [variant.colorName, ...attributes].filter(Boolean).join(" · ");
}

async function seedOrders() {
  await connectDatabase();
  const [products, customerUsers, admin] = await Promise.all([
    ProductModel.find({ status: "active", deletedAt: null, "variants.0": { $exists: true } })
      .select("name images basePrice salePrice variants")
      .limit(12)
      .lean(),
    UserModel.find({ role: "customer", status: "active", deletedAt: null }).select("_id").limit(6).lean(),
    UserModel.findOne({ role: "admin", status: "active", deletedAt: null }).select("_id").lean(),
  ]);

  if (products.length < 2) {
    throw new Error("Cần ít nhất 2 sản phẩm đang hoạt động. Hãy chạy npm run seed:products trước.");
  }

  let inserted = 0;
  let skipped = 0;
  for (const [index, state] of sampleStatuses.entries()) {
    const selectedProducts = [products[index % products.length]!, products[(index + 3) % products.length]!]
      .slice(0, index % 3 === 0 ? 2 : 1);
    const items = selectedProducts.map((product, productIndex) => {
      const variant = product.variants[(index + productIndex) % product.variants.length]!;
      const variantWithId = variant as ProductVariant & { _id?: Types.ObjectId };
      const quantity = productIndex === 0 && index % 4 === 0 ? 2 : 1;
      const unitPrice = variant.salePrice ?? variant.price ?? product.salePrice ?? product.basePrice;
      return {
        product: product._id,
        variantId: variantWithId._id ?? null,
        sku: variant.sku,
        productName: product.name,
        variantName: variantLabel(variant),
        imageUrl: variant.imageUrl || product.images.find((image) => image.isPrimary)?.url || product.images[0]?.url || "",
        unitPrice,
        quantity,
        lineTotal: unitPrice * quantity,
      };
    });
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const shippingFee = subtotal >= 1_000_000 ? 0 : 30_000;
    const discount = index % 5 === 0 ? Math.min(50_000, subtotal) : 0;
    const customer = customers[index % customers.length]!;
    const createdAt = new Date(Date.now() - index * 7 * 60 * 60 * 1000);
    const progression = progressionFor(state.status);
    const orderCode = `DH-DEMO-${String(index + 1).padStart(3, "0")}`;

    const result = await OrderModel.updateOne(
      { orderCode },
      {
        $setOnInsert: {
          orderCode,
          user: customerUsers[index % Math.max(customerUsers.length, 1)]?._id ?? null,
          customer: { fullName: customer.fullName, phone: customer.phone, email: customer.email },
          shippingAddress: {
            addressLine: customer.addressLine,
            ward: customer.ward,
            district: customer.district,
            province: customer.province,
          },
          items,
          subtotal,
          shippingFee,
          discount,
          total: subtotal + shippingFee - discount,
          status: state.status,
          paymentMethod: index % 3 === 0 ? "bank_transfer" : "cod",
          paymentStatus: state.paymentStatus,
          paymentPaidAt: state.paymentStatus === "paid" || state.paymentStatus === "refunded" ? createdAt : null,
          customerNote: index % 4 === 0 ? "Gọi trước khi giao giúp mình." : "",
          adminNote: index === 2 ? "Khách quen, ưu tiên kiểm tra kỹ sản phẩm trước khi đóng gói." : "",
          cancellationReason: state.status === "cancelled" ? "Khách yêu cầu hủy do thay đổi nhu cầu." : "",
          statusHistory: progression.map((status, historyIndex) => ({
            from: historyIndex === 0 ? null : progression[historyIndex - 1],
            to: status,
            note: status === "cancelled" ? "Khách yêu cầu hủy do thay đổi nhu cầu." : "Dữ liệu mẫu phục vụ kiểm thử.",
            changedBy: historyIndex === 0 ? null : admin?._id ?? null,
            changedAt: new Date(createdAt.getTime() + historyIndex * 45 * 60 * 1000),
          })),
          paymentHistory: [{
            from: null,
            to: state.paymentStatus,
            note: "Dữ liệu thanh toán mẫu.",
            changedBy: admin?._id ?? null,
            changedAt: createdAt,
          }],
          createdAt,
        },
      },
      { upsert: true },
    );

    if (result.upsertedCount) inserted += 1;
    else skipped += 1;
  }

  console.log(`Orders ready: ${inserted} added, ${skipped} already existed.`);
}

seedOrders()
  .catch((error) => {
    console.error("Unable to seed orders:", error);
    process.exitCode = 1;
  })
  .finally(disconnectDatabase);
