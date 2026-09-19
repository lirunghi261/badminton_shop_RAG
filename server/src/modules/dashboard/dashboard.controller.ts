import type { Request, Response } from "express";
import mongoose from "mongoose";

export async function getDashboardSummary(_request: Request, response: Response): Promise<void> {
  const database = mongoose.connection.db;
  if (!database) {
    throw new Error("Database is not connected");
  }

  const [products, orders, customers, lowStock, revenueResult] = await Promise.all([
    database.collection("products").countDocuments({ status: { $ne: "deleted" } }),
    database.collection("orders").countDocuments({}),
    database.collection("users").countDocuments({ role: "customer" }),
    database.collection("products").countDocuments({ stock: { $lte: 5 }, status: "active" }),
    database
      .collection("orders")
      .aggregate<{ total: number }>([
        { $match: { status: "delivered", paymentStatus: "paid" } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ])
      .toArray(),
  ]);

  response.json({
    success: true,
    data: {
      products,
      orders,
      customers,
      lowStock,
      revenue: revenueResult[0]?.total ?? 0,
    },
  });
}

