# Frontend - Task 0 (foundation fixes)

## How to apply
1. Stop `npm run dev`.
2. Extract this zip INTO your frontend folder (the one with package.json, `app/`, `components/`). Overwrite when asked.
3. No new packages. Your `.env.local` is untouched (see `.env.example`). Start `npm run dev`.
Works together with the backend Task 0 zip (apply that first, then log in once more).

## What changed
**Fixed bugs**
- **Wrong password now shows the server message** ("Invalid email or password"). `login()` used to swallow the error, so nothing appeared.
- The axios 401 handler no longer wipes storage and reloads the page when a *login/register* returns 401 (it would have broken the login error once the backend returns 401).
- **`/` no longer sends logged-in users to /login** on refresh (it ignored the `loading` flag).
- **Auth guard**: new `components/RequireAuth.tsx`, used on browse, search, watch and profiles. Logged-out users go to /login; users with no chosen profile go to /profiles. It waits for the saved login to be checked, so refresh keeps you logged in.
- **Browse is real data only**: hero, "Top 10", "New Releases", genre rows and "All Movies" are built from `/api/movies`; the "Top Picks for <profile>" row comes from the AI. All mock rows are gone (they could not be played). Loading, error (with Try again) and empty states added.
- **Search**: no more fake mock results when the API returns nothing.
- Missing CSS added to `globals.css`: `hero-gradient`, `row-fade-left/right`, `scrollbar-hide`, `animate-fade-in(-up)`. Your components used these classes but they were never defined.
- Signup: password minimum is 6 (same as backend), loading state is set. Login no longer blocks short passwords on the client.
- Profiles page: a failed "add profile" keeps what you typed and shows the server's message; removed unused mock imports.
- Upload page: the mock rating (PG-13, TV-MA...) is converted to the backend scale (All/7+/13+/16+/18+) so Kids profiles can actually get recommendations; lists up to 100 movies.
- `Navbar`: removed unused `useSearchParams`. `next.config.ts`: removed unused `API_URL`. `.gitignore`: keeps `.env.example`.
- New `lib/movieApi.ts`: ONE `toMovie()` mapper (was copy-pasted in browse and search).

**Not fixed yet (stubs I left on purpose - they belong to the tasks)**
Buttons that do nothing (+ / thumbs / Like in the modal), "More Like This" placeholders, nav links to `/my-list`, `/account`, `/help` (pages do not exist), "Forgot password" / "Use a Sign-In Code", profile name text is not clickable (only the avatar), profile menu opens on hover only (no mobile), video player has no error state. `/watch/:id` still adds the movie to the watchlist - Task 2 replaces that with real watch history.

## How I tested
- TypeScript type-check: clean (only `LayoutProps`, which Next generates itself).
- Real browser run (Playwright): the actual Next app talking to the actual Express app (database faked). 15/15 steps passed: logged-out redirect, wrong-password message, login -> profiles -> browse, real movies and no mock titles, AI row, reload stays logged in, `/` -> /browse, search empty state and real result, CSS gradient/scrollbar, guard on /watch.
- Not tested: real video playback and real images (my sandbox has no internet).
