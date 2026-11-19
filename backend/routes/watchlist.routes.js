import express from "express";

import {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
} from "../controllers/watchlist.controller.js";

import protect from "../middleware/auth.middleware.js";
import validateObjectId from "../middleware/validateObjectId.js";

const router = express.Router();

router.use(protect);

// GET    /api/watchlist?profileId=...
router.get("/", getWatchlist);

// POST   /api/watchlist/:movieId        body: { profileId }
router.post("/:movieId", validateObjectId("movieId"), addToWatchlist);

// DELETE /api/watchlist/:movieId?profileId=...   (body { profileId } also works)
router.delete("/:movieId", validateObjectId("movieId"), removeFromWatchlist);

export default router;
