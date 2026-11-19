// Usage:  npm run make-admin -- you@example.com
import "dotenv/config";
import mongoose from "mongoose";
import User from "../models/User.js";

const email = process.argv[2]?.trim().toLowerCase();

if (!email) {
  console.error("Usage: npm run make-admin -- you@example.com");
  process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI);
const result = await User.updateOne({ email }, { $set: { role: "admin" } });

console.log(
  result.matchedCount
    ? `${email} is now an admin. Log out and log in again to see it.`
    : `No user found with email ${email}. Register first.`,
);

await mongoose.disconnect();
