import { rateLimit } from "express-rate-limit";

// Shared handler: same JSON shape as the rest of the API.
const handler = (message) => (req, res) => {
  const resetTime = req.rateLimit?.resetTime;
  const retryAfterSec = resetTime
    ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
    : 60;
  res.set("Retry-After", String(retryAfterSec));
  res.status(429).json({ message, retryAfterSec });
};

const base = {
  standardHeaders: "draft-7",
  legacyHeaders: false,
};

// Login: counts only FAILED attempts (successful logins don't burn the budget),
// keyed by IP so one attacker can't lock out a victim's email.
export const loginLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  handler: handler("Too many failed login attempts. Try again in a few minutes."),
});

// Register: counts every attempt, stricter.
export const registerLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 10,
  handler: handler("Too many sign-up attempts from this network. Try again later."),
});
