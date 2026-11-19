import express from "express";
import protect from "../middleware/auth.middleware.js";
import { loginLimiter, registerLimiter } from "../middleware/rateLimit.middleware.js";
import { register, login, getMe } from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/register", registerLimiter, register);
router.post("/login", loginLimiter, login);
router.get("/me", protect, getMe);

export default router;
