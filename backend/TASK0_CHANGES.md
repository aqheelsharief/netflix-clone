# Backend - Task 0 (foundation fixes)

## How to apply
1. Stop the server.
2. Extract this zip INTO your backend folder (the one with package.json). Overwrite when asked.
3. **Delete `controllers/auth.controler.js`** (it was renamed to `auth.controller.js`).
4. Make yourself an admin (new, and now required to upload/edit/delete movies):
   `npm run make-admin -- your@email.com`   then log out and log in again.
5. If you already uploaded movies, fix their maturity values once:
   `npm run migrate:maturity -- --dry`  (preview)  then  `npm run migrate:maturity`
6. Optional: add `CLIENT_URL=http://localhost:3000` to your `.env` (see `.env.example`).

No new npm packages. Nothing to install.

## What changed

**Security**
- Movie create / update / delete are now **admin only** (`requireAdmin` in `middleware/auth.middleware.js`). Before, any logged-in user could delete the catalog.
- Uploads: extension is chosen by the server (never from the filename), random file names, the first bytes of the file must really look like a video, and the mime list now matches what browsers send (mp4, webm, mov, mkv, mpeg).
- Any request that fails (validation, 404, DB error) deletes the file it just uploaded, so no orphan files.
- Upload folder uses absolute paths, so it works from any start folder.
- CORS uses `CLIENT_URL` (comma separated) when set; JSON body limit 1mb; `nosniff` on static files.
- Raw error messages are hidden when `NODE_ENV=production`.

**Bugs fixed**
- Register with a 31-50 character name no longer creates a user without profiles (profile name is cut to 30; if profile creation ever fails the user is removed).
- Error handler read `err.statusCODE` (typo), so every 400/413 became a 500. Fixed in `middleware/error.middleware.js`; bad JSON, bad file type and too-large files now return proper 400/413.
- Invalid IDs return 400 instead of 500 (`validateObjectId` on every `/:id` route).
- Empty/missing request bodies return 400 instead of crashing (Express 5 leaves `req.body` undefined).
- `limit=0` used to return the entire catalog; `page=abc` crashed. Both are sane now.
- Updating a movie deleted the old video BEFORE saving. Now the save happens first.
- Deleting a movie also deletes its watchlist entries (no more `movie: null` items).
- `dotenv` now loads first in `server.js`; `PORT` defaults to 5000; server stops with a clear message if `MONGO_URI` or `JWT_SECRET` is missing.
- Search no longer hides movies that are in the profile's watchlist, and the AI ranking can no longer drop real matches (AI order first, then the rest). `q` must be a string, max 100 chars.
- Login: unknown user and wrong password take the same time; disabled accounts get 403.
- Profiles: validated types/maturity; Kids profiles are always forced to `7+`.

**Behaviour changes your frontend must know about**
- Wrong login -> **401** (was 400). Duplicate email -> **409**. Login and /me return **200** (were 201).
- Watchlist DELETE: use `DELETE /api/watchlist/:movieId?profileId=...` (the old JSON body still works).
- `maturityRating` on a movie must be one of `All, 7+, 13+, 16+, 18+`.
- `auth.controler.js` renamed to `auth.controller.js` (routes updated).

**Not done yet (planned in the tasks)**
Rate limiting + login-attempt tracking (Task 3), Kids filter on `/movies` (Tasks 1 and 5), recommendation caching + non-AI fallback (Task 1), watch history (Task 2), cloud video storage (only needed when you deploy).

## How I tested - and what you must still check
I could NOT run a real MongoDB in my sandbox. I ran the real Express app with the database layer replaced by an in-memory fake: 62 checks passed (auth, admin check, upload hardening, file cleanup, validation, range requests, watchlist, search, delete).
Please run these against your real database:
1. Register with a ~40 character name -> works, 2 profiles created.
2. Wrong password -> 401 with "Invalid email or password".
3. As a normal user, `POST /api/movies` -> 403.
4. As admin, upload an mp4 -> 201, and the video plays from `/uploads/videos/...`.
5. Replace the video with PATCH -> old file is gone from `uploads/videos`.
6. Delete a movie that is in someone's watchlist -> file removed, list has no broken item.
7. Search for a movie that is in your list -> it shows up.
