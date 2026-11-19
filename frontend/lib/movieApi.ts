import type { Movie } from "@/lib/movie";

// The shape the backend sends (Mongo documents use _id and isNewRelease).
export type ApiMovie = {
  _id?: string;
  id?: string;
  title: string;
  description: string;
  longDescription?: string;
  backdrop?: string;
  poster?: string;
  year: number;
  rating: string;
  duration: string;
  genres?: string[];
  cast?: string[];
  match?: number;
  isNew?: boolean;
  isNewRelease?: boolean;
  isTop10?: boolean;
  videoUrl?: string;
};

// One place that converts backend data into the Movie type the components use.
export const toMovie = (movie: ApiMovie): Movie => ({
  id: movie._id || movie.id || "",
  title: movie.title,
  description: movie.description,
  longDescription: movie.longDescription || movie.description,
  backdrop: movie.backdrop || "",
  poster: movie.poster || "",
  year: movie.year,
  rating: movie.rating,
  duration: movie.duration,
  genres: movie.genres || [],
  cast: movie.cast || [],
  match: movie.match || 0,
  isNew: movie.isNew ?? movie.isNewRelease ?? false,
  isTop10: movie.isTop10 ?? false,
  videoUrl: movie.videoUrl || "",
});
