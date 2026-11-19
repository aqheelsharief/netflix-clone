// One-time fix for movies that were uploaded with a rating like "PG-13" or
// "TV-MA" in the maturityRating field. The app uses: All, 7+, 13+, 16+, 18+.
//
// Preview:  npm run migrate:maturity -- --dry
// Apply:    npm run migrate:maturity
import "dotenv/config";
import mongoose from "mongoose";
import Movie from "../models/Movie.js";

const VALID = ["All", "7+", "13+", "16+", "18+"];
const MAP = {
  G: "All",
  "TV-G": "All",
  "TV-Y": "All",
  PG: "7+",
  "TV-PG": "7+",
  "TV-Y7": "7+",
  "PG-13": "13+",
  "TV-14": "13+",
  R: "16+",
  "TV-MA": "18+",
  "NC-17": "18+",
};
const dry = process.argv.includes("--dry");

await mongoose.connect(process.env.MONGO_URI);

const movies = await Movie.find({}, "title maturityRating").lean();
let changed = 0;

for (const movie of movies) {
  if (VALID.includes(movie.maturityRating)) continue;
  const next = MAP[movie.maturityRating] || "13+";
  console.log(`${movie.title}: "${movie.maturityRating}" -> "${next}"`);
  if (!dry) {
    await Movie.updateOne({ _id: movie._id }, { $set: { maturityRating: next } });
  }
  changed++;
}

console.log(
  dry ? `${changed} movie(s) would change.` : `${changed} movie(s) updated.`,
);
await mongoose.disconnect();
