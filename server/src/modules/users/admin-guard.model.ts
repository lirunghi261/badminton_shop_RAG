import { Schema, model } from "mongoose";

// All administrative account mutations lock this record inside a transaction,
// so two administrators cannot concurrently remove the last active accounts.
export const AdminGuardModel = model("AdminGuard", new Schema({
  _id: { type: String, required: true },
  revision: { type: Number, default: 0 },
}, { versionKey: false }));
