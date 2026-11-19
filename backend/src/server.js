// Must be the FIRST import: ES module imports are hoisted, so loading .env
// later in this file would be too late for the modules imported below.
import "dotenv/config";
import app from "./app.js";
import connectDb from "../config/db.js";

const missing = ["MONGO_URI", "JWT_SECRET"].filter((key) => !process.env[key]);
if (missing.length) {
  console.error(
    `Missing required env vars: ${missing.join(", ")}. Copy .env.example to .env and fill them in.`,
  );
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDb();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server error:", error.message);
    process.exit(1);
  }
};

startServer();
