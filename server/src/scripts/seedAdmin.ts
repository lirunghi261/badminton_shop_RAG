import bcrypt from "bcryptjs";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { env } from "../config/env.js";
import { UserModel } from "../modules/users/user.model.js";

async function seedAdmin(): Promise<void> {
  await connectDatabase();
  const password = await bcrypt.hash(env.ADMIN_PASSWORD, 12);

  const admin = await UserModel.findOneAndUpdate(
    { email: env.ADMIN_EMAIL.toLowerCase() },
    {
      $set: {
        name: env.ADMIN_NAME,
        password,
        role: "admin",
        status: "active",
      },
    },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true },
  );

  console.log(`Admin ready: ${admin.email}`);
}

seedAdmin()
  .catch((error) => {
    console.error("Unable to seed admin:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
