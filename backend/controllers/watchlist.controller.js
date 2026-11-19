import mongoose from "mongoose";

import Watchlist from "../models/Watchlist.js";
import Movie from "../models/Movie.js";
import Profile from "../models/Profile.js";
import HttpError from "../utils/HttpError.js";

/*
| Returns the profile only if it belongs to the logged-in user.
| (A malformed ID counts as "not found".)
*/
const getUserProfile = async (profileId, userId) => {
  if (
    typeof profileId !== "string" ||
    !mongoose.Types.ObjectId.isValid(profileId)
  ) {
    return null;
  }

  return Profile.findOne({
    _id: profileId,
    user: userId,
    isActive: true,
  });
};

const requireProfile = async (profileId, userId) => {
  if (!profileId) throw new HttpError(400, "profileId is required");

  const profile = await getUserProfile(profileId, userId);
  if (!profile) throw new HttpError(404, "Profile not found");

  return profile;
};

/*
|--------------------------------------------------------------------------
| GET WATCHLIST      GET /api/watchlist?profileId=...
|--------------------------------------------------------------------------
*/

export const getWatchlist = async (req, res) => {
  const { profileId } = req.query;
  await requireProfile(profileId, req.user._id);

  const items = await Watchlist.find({ profile: profileId })
    .populate("movie")
    .sort({ addedAt: -1 });

  res.status(200).json({
    success: true,
    // Skip entries whose movie no longer exists (or was unpublished).
    watchlist: items.filter((item) => item.movie && item.movie.isPublished),
  });
};

/*
|--------------------------------------------------------------------------
| ADD TO WATCHLIST      POST /api/watchlist/:movieId   body: { profileId }
|--------------------------------------------------------------------------
*/

export const addToWatchlist = async (req, res) => {
  const profileId = req.body?.profileId;
  const { movieId } = req.params;

  await requireProfile(profileId, req.user._id);

  const movie = await Movie.findOne({ _id: movieId, isPublished: true });
  if (!movie) throw new HttpError(404, "Movie not found");

  const existing = await Watchlist.findOne({
    profile: profileId,
    movie: movieId,
  });

  if (existing) {
    return res.status(409).json({
      success: false,
      message: "Movie already exists in watchlist",
      watchlistItem: existing,
    });
  }

  // If two requests race, the unique index rejects the second (error 11000 -> 409).
  const watchlistItem = await Watchlist.create({
    profile: profileId,
    movie: movieId,
  });

  await watchlistItem.populate("movie");

  res.status(201).json({
    success: true,
    message: "Movie added to watchlist",
    watchlistItem,
  });
};

/*
|--------------------------------------------------------------------------
| REMOVE FROM WATCHLIST
| DELETE /api/watchlist/:movieId?profileId=...
| (a JSON body { profileId } is still accepted for the old frontend code)
|--------------------------------------------------------------------------
*/

export const removeFromWatchlist = async (req, res) => {
  const profileId = req.query.profileId ?? req.body?.profileId;
  const { movieId } = req.params;

  await requireProfile(profileId, req.user._id);

  const deleted = await Watchlist.findOneAndDelete({
    profile: profileId,
    movie: movieId,
  });

  if (!deleted) throw new HttpError(404, "Movie is not in watchlist");

  res.status(200).json({
    success: true,
    message: "Movie removed from watchlist",
  });
};
