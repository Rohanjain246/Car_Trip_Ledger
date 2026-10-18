import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "./models/User.js";

async function createAdmin() {
  const [emailArgument, nameArgument] = process.argv.slice(2);
  const email = emailArgument?.trim().toLowerCase();
  const name = nameArgument?.trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI must be configured.");
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new Error("Usage: npm run create-admin -- <email> <name>");
  }
  if (!name || name.length > 100) {
    throw new Error("Provide an admin name between 1 and 100 characters.");
  }
  if (!password || password.length < 12 || Buffer.byteLength(password, "utf8") > 72) {
    throw new Error("Set ADMIN_PASSWORD to a password of at least 12 characters and no more than 72 bytes.");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const passwordHash = await bcrypt.hash(password, 12);
  await User.findOneAndUpdate(
    { email },
    { $set: { name, email, passwordHash, role: "admin" } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );
  console.log(`Administrator account provisioned for ${email}.`);
}

createAdmin()
  .catch((error) => {
    console.error("Could not provision administrator:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
