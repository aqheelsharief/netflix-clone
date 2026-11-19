import express from "express";
import cors from "cors";
import authRoutes from "../routes/auth.routes.js";
import profileRoutes from "../routes/profile.routes.js";
import movieRoutes from "../routes/movie.routes.js";
import watchlistRoutes from "../routes/watchlist.routes.js";
import recommendationRoutes from "../routes/recommendation.routes.js";
import { UPLOAD_ROOT } from "../config/paths.js";
import { notFound, errorHandler } from "../middleware/error.middleware.js";

const app = express();

app.disable("x-powered-by");

// Behind Render/Vercel proxies: use the real client IP (needed for rate limiting).
app.set("trust proxy", 1);

// CLIENT_URL can hold several origins separated by commas.
// If it is not set (local dev), any origin is allowed.
const allowedOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : "*",
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/watchlist", watchlistRoutes);
app.use("/api/recommendations", recommendationRoutes);

// express.static already supports HTTP Range requests (video seeking).
app.use(
  "/uploads",
  express.static(UPLOAD_ROOT, {
    setHeaders: (res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
    },
  }),
);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Netflix backend is running",
  });
});

app.use(notFound);
app.use(errorHandler);

export default app;
