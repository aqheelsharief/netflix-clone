"use client";

import Footer from "@/components/Footer";
import HeroBanner from "@/components/HeroBanner";
import MovieDetailModal from "@/components/MovieDetailModal";
import MovieRow from "@/components/MovieRow";
import Navbar from "@/components/Navbar";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/context/Authcontext";
import axiosInstance from "@/lib/axios";
import { Movie } from "@/lib/movie";
import { toMovie, type ApiMovie } from "@/lib/movieApi";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

function NavbarWithSuspense() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#141414]" />}>
      <Navbar />
    </Suspense>
  );
}

function BrowseContent() {
  const { selectedProfile } = useAuth();

  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [movies, setMovies] = useState<Movie[]>([]);
  const [moviesLoading, setMoviesLoading] = useState(true);
  const [moviesError, setMoviesError] = useState("");

  const [recommended, setRecommended] = useState<Movie[]>([]);
  const [recommendationLoading, setRecommendationLoading] = useState(true);

  const handleSelectMovie = (movie: Movie) => {
    setSelectedMovie(movie);
    setModalOpen(true);
  };

  const fetchMovies = useCallback(async () => {
    try {
      setMoviesLoading(true);
      setMoviesError("");
      const response = await axiosInstance.get("/movies", {
        params: { limit: 100 },
      });
      const list: ApiMovie[] = response.data?.movies || [];
      setMovies(list.map(toMovie));
    } catch (error: any) {
      console.error("Failed to fetch movies:", error);
      setMoviesError(
        error?.response?.data?.message || "Could not load movies.",
      );
    } finally {
      setMoviesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  useEffect(() => {
    if (!selectedProfile) return;
    let cancelled = false;

    const fetchRecommendations = async () => {
      try {
        setRecommendationLoading(true);
        const response = await axiosInstance.get("/recommendations", {
          params: { profileId: selectedProfile._id },
        });
        if (cancelled) return;
        const list: ApiMovie[] = response.data?.movies || [];
        setRecommended(list.map(toMovie));
      } catch (error) {
        if (cancelled) return;
        console.error("Failed to fetch recommendations:", error);
        setRecommended([]);
      } finally {
        if (!cancelled) setRecommendationLoading(false);
      }
    };

    fetchRecommendations();
    // If the profile changes before the answer arrives, ignore the old answer.
    return () => {
      cancelled = true;
    };
  }, [selectedProfile]);

  // Everything below is built from the real movies in the database.
  const hero = useMemo(
    () =>
      movies.find((movie) => movie.isTop10) ??
      movies.find((movie) => movie.isNew) ??
      movies[0] ??
      null,
    [movies],
  );

  const top10 = useMemo(
    () => movies.filter((movie) => movie.isTop10).slice(0, 10),
    [movies],
  );

  const newReleases = useMemo(
    () => movies.filter((movie) => movie.isNew),
    [movies],
  );

  const genreRows = useMemo(() => {
    const byGenre = new Map<string, Movie[]>();
    for (const movie of movies) {
      for (const genre of movie.genres) {
        if (!byGenre.has(genre)) byGenre.set(genre, []);
        byGenre.get(genre)!.push(movie);
      }
    }
    return [...byGenre.entries()]
      .filter(([, list]) => list.length >= 2)
      .map(([title, list]) => ({ title, movies: list }));
  }, [movies]);

  return (
    <div className="min-h-screen bg-[#141414] overflow-x-hidden">
      <NavbarWithSuspense />

      <main className="relative">
        {moviesLoading ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-white/20 border-t-red-600 rounded-full animate-spin" />
          </div>
        ) : moviesError ? (
          <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
            <p className="text-white/80 text-lg">{moviesError}</p>
            <button
              onClick={fetchMovies}
              className="bg-white text-black font-bold px-6 py-2 rounded-md hover:bg-white/80 transition-colors"
            >
              Try again
            </button>
          </div>
        ) : movies.length === 0 ? (
          <div className="min-h-screen flex flex-col items-center justify-center gap-2 px-4 text-center">
            <p className="text-white text-xl font-bold">No movies yet</p>
            <p className="text-white/60">
              An admin can add movies from the Upload page.
            </p>
          </div>
        ) : (
          <>
            {hero && <HeroBanner movie={hero} onMoreInfo={handleSelectMovie} />}

            <div className="relative z-20 -mt-16 md:-mt-32 pb-12">
              {recommendationLoading ? (
                <div className="mx-4 md:mx-12 mb-8 md:mb-12 h-40 rounded-md bg-white/5 animate-pulse" />
              ) : (
                recommended.length > 0 && (
                  <MovieRow
                    title={`Top Picks for ${selectedProfile?.name ?? "You"}`}
                    movies={recommended}
                    onSelectMovie={handleSelectMovie}
                  />
                )
              )}

              {top10.length > 0 && (
                <MovieRow
                  title="Top 10 Today"
                  movies={top10}
                  onSelectMovie={handleSelectMovie}
                  isTop10
                />
              )}

              {newReleases.length > 0 && (
                <MovieRow
                  title="New Releases"
                  movies={newReleases}
                  onSelectMovie={handleSelectMovie}
                />
              )}

              {genreRows.map((row) => (
                <MovieRow
                  key={row.title}
                  title={row.title}
                  movies={row.movies}
                  onSelectMovie={handleSelectMovie}
                />
              ))}

              <MovieRow
                title="All Movies"
                movies={movies}
                onSelectMovie={handleSelectMovie}
              />

              <Footer />
            </div>
          </>
        )}
      </main>

      <MovieDetailModal
        movie={selectedMovie}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}

export default function BrowsePage() {
  return (
    <RequireAuth requireProfile>
      <BrowseContent />
    </RequireAuth>
  );
}
