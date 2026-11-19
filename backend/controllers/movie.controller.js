import Movie from "../models/Movie.js";
import Watchlist from "../models/Watchlist.js";
import HttpError from "../utils/HttpError.js";
import { videoUrlFor, deleteVideoByUrl } from "../config/paths.js";

/*
| Express 5 sends errors from async handlers to the error middleware by itself,
| so these controllers just `throw new HttpError(status, message)`.
*/

const MATURITY_LEVELS = ["All", "7+", "13+", "16+", "18+"];

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const asString = (value) => (typeof value === "string" ? value.trim() : "");

const toBool = (value) => value === true || value === "true";

// Accepts ["a","b"], '["a","b"]' (JSON string) or "a, b" (comma string).
const parseList = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value !== "string" || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
    // not JSON, fall through to comma split
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseYear = (value) => {
  const year = Number(value);
  const maxYear = new Date().getFullYear() + 5;
  if (!Number.isInteger(year) || year < 1888 || year > maxYear) {
    throw new HttpError(400, "Year must be a valid year");
  }
  return year;
};

const parseMatch = (value) => {
  if (value === undefined || value === null || value === "") return 0;
  const match = Number(value);
  if (!Number.isFinite(match) || match < 0 || match > 100) {
    throw new HttpError(400, "Match must be a number between 0 and 100");
  }
  return match;
};

const parseMaturity = (value) => {
  if (!MATURITY_LEVELS.includes(value)) {
    throw new HttpError(
      400,
      `Maturity rating must be one of: ${MATURITY_LEVELS.join(", ")}`,
    );
  }
  return value;
};

const parseReleaseDate = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new HttpError(400, "Release date is not a valid date");
  }
  return date;
};

// ?genre=a&genre=b makes Express give us an array: only accept plain strings.
const queryString = (value) => (typeof value === "string" ? value.trim() : "");

/*
|--------------------------------------------------------------------------
| CREATE MOVIE  (admin)
|--------------------------------------------------------------------------
*/

export const createMovie = async (req, res) => {
  const body = req.body ?? {};

  const title = asString(body.title);
  const description = asString(body.description);
  const rating = asString(body.rating);
  const duration = asString(body.duration);
  const backdrop = asString(body.backdrop);
  const poster = asString(body.poster);

  if (!title || !description || !rating || !duration || !body.year) {
    throw new HttpError(
      400,
      "Title, description, year, rating and duration are required",
    );
  }

  if (!backdrop || !poster) {
    throw new HttpError(400, "Backdrop and poster URLs are required");
  }

  if (!req.file) {
    throw new HttpError(400, "Movie video is required");
  }

  const movie = await Movie.create({
    title,
    description,
    longDescription: asString(body.longDescription),
    backdrop,
    poster,
    year: parseYear(body.year),
    rating,
    duration,
    genres: parseList(body.genres),
    cast: parseList(body.cast),
    match: parseMatch(body.match),
    isNewRelease: toBool(body.isNewRelease),
    isTop10: toBool(body.isTop10),
    videoUrl: videoUrlFor(req.file.filename),
    trailerUrl: asString(body.trailerUrl),
    director: asString(body.director),
    language: asString(body.language) || "English",
    maturityRating: parseMaturity(asString(body.maturityRating) || "13+"),
    releaseDate: parseReleaseDate(body.releaseDate),
  });

  res.status(201).json({
    success: true,
    message: "Movie created successfully",
    movie,
  });
};

/*
|--------------------------------------------------------------------------
| GET ALL MOVIES
|--------------------------------------------------------------------------
*/

export const getMovies = async (req, res) => {
  const search = queryString(req.query.search);
  const genre = queryString(req.query.genre);

  // limit=0 would mean "no limit" in Mongo, and page=abc would be NaN: clean both.
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

  const query = { isPublished: true };

  if (search) query.$text = { $search: search };
  if (genre) query.genres = genre;

  if (req.query.isNewRelease === "true" || req.query.isNewRelease === "false") {
    query.isNewRelease = req.query.isNewRelease === "true";
  }
  if (req.query.isTop10 === "true" || req.query.isTop10 === "false") {
    query.isTop10 = req.query.isTop10 === "true";
  }

  const [movies, total] = await Promise.all([
    Movie.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Movie.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    movies,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
};

/*
|--------------------------------------------------------------------------
| GET SINGLE MOVIE
|--------------------------------------------------------------------------
*/

export const getMovie = async (req, res) => {
  const movie = await Movie.findOne({
    _id: req.params.movieId,
    isPublished: true,
  });

  if (!movie) throw new HttpError(404, "Movie not found");

  res.status(200).json({ success: true, movie });
};

/*
|--------------------------------------------------------------------------
| UPDATE MOVIE  (admin)
|--------------------------------------------------------------------------
*/

export const updateMovie = async (req, res) => {
  const movie = await Movie.findById(req.params.movieId);
  if (!movie) throw new HttpError(404, "Movie not found");

  const body = req.body ?? {};

  // Required text fields: if sent, they cannot be empty.
  for (const key of [
    "title",
    "description",
    "rating",
    "duration",
    "backdrop",
    "poster",
  ]) {
    if (body[key] === undefined) continue;
    const value = asString(body[key]);
    if (!value) throw new HttpError(400, `${key} cannot be empty`);
    movie[key] = value;
  }

  // Optional text fields: if sent, they are stored as given.
  for (const key of ["longDescription", "trailerUrl", "director"]) {
    if (body[key] !== undefined) movie[key] = asString(body[key]);
  }
  if (body.language !== undefined) {
    movie.language = asString(body.language) || "English";
  }

  if (body.year !== undefined) movie.year = parseYear(body.year);
  if (body.match !== undefined) movie.match = parseMatch(body.match);
  if (body.genres !== undefined) movie.genres = parseList(body.genres);
  if (body.cast !== undefined) movie.cast = parseList(body.cast);
  if (body.maturityRating !== undefined) {
    movie.maturityRating = parseMaturity(asString(body.maturityRating));
  }
  if (body.releaseDate !== undefined) {
    movie.releaseDate = parseReleaseDate(body.releaseDate);
  }
  if (body.isNewRelease !== undefined) {
    movie.isNewRelease = toBool(body.isNewRelease);
  }
  if (body.isTop10 !== undefined) movie.isTop10 = toBool(body.isTop10);
  if (body.isPublished !== undefined) {
    movie.isPublished = toBool(body.isPublished);
  }

  let oldVideoUrl = null;
  if (req.file) {
    oldVideoUrl = movie.videoUrl;
    movie.videoUrl = videoUrlFor(req.file.filename);
  }

  await movie.save();

  // Only delete the old video AFTER the save worked, so a failed save never
  // leaves the database pointing at a file that no longer exists.
  if (oldVideoUrl) await deleteVideoByUrl(oldVideoUrl);

  res.status(200).json({
    success: true,
    message: "Movie updated successfully",
    movie,
  });
};

/*
|--------------------------------------------------------------------------
| DELETE MOVIE  (admin)
|--------------------------------------------------------------------------
*/

export const deleteMovie = async (req, res) => {
  const { movieId } = req.params;

  const movie = await Movie.findById(movieId);
  if (!movie) throw new HttpError(404, "Movie not found");

  // Remove the movie and every watchlist entry pointing at it,
  // otherwise users' lists would contain broken (null) items.
  await Promise.all([
    Movie.deleteOne({ _id: movieId }),
    Watchlist.deleteMany({ movie: movieId }),
  ]);

  await deleteVideoByUrl(movie.videoUrl);

  res.status(200).json({
    success: true,
    message: "Movie deleted successfully",
  });
};

/*
|--------------------------------------------------------------------------
| INCREMENT VIEWS
|--------------------------------------------------------------------------
*/

export const incrementMovieViews = async (req, res) => {
  const movie = await Movie.findOneAndUpdate(
    { _id: req.params.movieId, isPublished: true },
    { $inc: { views: 1 } },
    { new: true },
  );

  if (!movie) throw new HttpError(404, "Movie not found");

  res.status(200).json({ success: true, views: movie.views });
};
