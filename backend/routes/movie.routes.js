import express from "express";

import {
  createMovie,
  getMovies,
  getMovie,
  updateMovie,
  deleteMovie,
  incrementMovieViews,
} from "../controllers/movie.controller.js";

import protect, { requireAdmin } from "../middleware/auth.middleware.js";
import upload, { verifyVideoUpload } from "../middleware/upload.middleware.js";
import validateObjectId from "../middleware/validateObjectId.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| PUBLIC
|--------------------------------------------------------------------------
*/

router.get("/", getMovies);
router.get("/:movieId", validateObjectId("movieId"), getMovie);
router.post("/:movieId/views", validateObjectId("movieId"), incrementMovieViews);

/*
|--------------------------------------------------------------------------
| ADMIN ONLY
|--------------------------------------------------------------------------
| Order matters: check the user and the ID BEFORE multer stores any file.
*/

router.post(
  "/",
  protect,
  requireAdmin,
  upload.single("video"),
  verifyVideoUpload,
  createMovie,
);

router.patch(
  "/:movieId",
  protect,
  requireAdmin,
  validateObjectId("movieId"),
  upload.single("video"),
  verifyVideoUpload,
  updateMovie,
);

router.delete(
  "/:movieId",
  protect,
  requireAdmin,
  validateObjectId("movieId"),
  deleteMovie,
);

export default router;
