

import express from "express";

import {
  getProfiles,
  getProfile,
  createProfile,
  updateProfile,
  deleteProfile,
  selectProfile,
} from "../controllers/profile.controller.js";

import protect from "../middleware/auth.middleware.js";
import validateObjectId from "../middleware/validateObjectId.js";

const router = express.Router();

// All profile routes require authentication
router.use(protect);

// Get all profiles
router.get("/", getProfiles);

// Get single profile
router.get("/:profileId", validateObjectId("profileId"), getProfile);

// Create profile
router.post("/", createProfile);

// Update profile
router.patch("/:profileId", validateObjectId("profileId"), updateProfile);

// Delete profile
router.delete("/:profileId", validateObjectId("profileId"), deleteProfile);

// Select profile
router.post("/:profileId/select", validateObjectId("profileId"), selectProfile);

export default router;
