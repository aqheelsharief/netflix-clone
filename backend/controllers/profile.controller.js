import Profile from "../models/Profile.js";

const MATURITY_LEVELS = ["All", "7+", "13+", "16+", "18+"];

// Returns an error message, or null when everything is fine.
const validateProfileFields = ({
  name,
  avatar,
  isKids,
  language,
  maturityLevel,
}) => {
  if (name !== undefined && (typeof name !== "string" || !name.trim())) {
    return "Profile name is required";
  }
  if (typeof name === "string" && name.trim().length > 30) {
    return "Profile name cannot exceed 30 characters";
  }
  if (avatar !== undefined && typeof avatar !== "string") {
    return "Avatar must be a string";
  }
  if (isKids !== undefined && typeof isKids !== "boolean") {
    return "isKids must be true or false";
  }
  if (language !== undefined && typeof language !== "string") {
    return "Language must be a string";
  }
  if (maturityLevel !== undefined && !MATURITY_LEVELS.includes(maturityLevel)) {
    return `Maturity level must be one of: ${MATURITY_LEVELS.join(", ")}`;
  }
  return null;
};

export const getProfiles = async (req, res) => {
  try {
    const profiles = await Profile.find({
      user: req.user._id,
      isActive: true,
    }).sort({
      createdAt: 1,
    });

    return res.status(200).json({
      success: true,
      profiles,
    });
  } catch (error) {
    console.error("Get profiles error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch profiles",
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    const { profileId } = req.params;

    const profile = await Profile.findOne({
      _id: profileId,
      user: req.user._id,
      isActive: true,
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error("Get profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
    });
  }
};

export const createProfile = async (req, res) => {
  try {
    const {
      name,
      avatar = "",
      isKids = false,
      language = "English",
      maturityLevel = "All",
    } = req.body ?? {};

    const validationError = validateProfileFields({
      name: name ?? "",
      avatar,
      isKids,
      language,
      maturityLevel,
    });

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    // Maximum 5 profiles per account
    const profileCount = await Profile.countDocuments({
      user: req.user._id,
      isActive: true,
    });

    if (profileCount >= 5) {
      return res.status(400).json({
        success: false,
        message: "You can have a maximum of 5 profiles",
      });
    }

    // Prevent duplicate profile names
    const existingProfile = await Profile.findOne({
      user: req.user._id,
      name: name.trim(),
      isActive: true,
    });

    if (existingProfile) {
      return res.status(409).json({
        success: false,
        message: "A profile with this name already exists",
      });
    }

    const profile = await Profile.create({
      user: req.user._id,
      name: name.trim(),
      avatar,
      isKids,
      language,
      // Kids profiles are always limited to 7+
      maturityLevel: isKids ? "7+" : maturityLevel,
    });

    return res.status(201).json({
      success: true,
      message: "Profile created successfully",
      profile,
    });
  } catch (error) {
    console.error("Create profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create profile",
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { profileId } = req.params;

    const { name, avatar, isKids, language, maturityLevel } = req.body ?? {};

    const validationError = validateProfileFields({
      name,
      avatar,
      isKids,
      language,
      maturityLevel,
    });

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const profile = await Profile.findOne({
      _id: profileId,
      user: req.user._id,
      isActive: true,
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Profile name cannot be empty",
        });
      }

      const duplicateProfile = await Profile.findOne({
        user: req.user._id,
        name: name.trim(),
        isActive: true,
        _id: {
          $ne: profileId,
        },
      });

      if (duplicateProfile) {
        return res.status(409).json({
          success: false,
          message: "A profile with this name already exists",
        });
      }

      profile.name = name.trim();
    }

    if (avatar !== undefined) {
      profile.avatar = avatar;
    }

    if (isKids !== undefined) {
      profile.isKids = isKids;
    }

    if (language !== undefined) {
      profile.language = language;
    }

    if (maturityLevel !== undefined) {
      profile.maturityLevel = maturityLevel;
    }

    // Kids profiles are always limited to 7+
    if (profile.isKids) {
      profile.maturityLevel = "7+";
    }

    await profile.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      profile,
    });
  } catch (error) {
    console.error("Update profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
};

export const deleteProfile = async (req, res) => {
  try {
    const { profileId } = req.params;

    const profile = await Profile.findOne({
      _id: profileId,
      user: req.user._id,
      isActive: true,
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    // Don't allow deleting the only profile
    const profileCount = await Profile.countDocuments({
      user: req.user._id,
      isActive: true,
    });

    if (profileCount <= 1) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your only profile",
      });
    }

    // Soft delete
    profile.isActive = false;

    await profile.save();

    return res.status(200).json({
      success: true,
      message: "Profile deleted successfully",
    });
  } catch (error) {
    console.error("Delete profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete profile",
    });
  }
};

export const selectProfile = async (req, res) => {
  try {
    const { profileId } = req.params;

    const profile = await Profile.findOne({
      _id: profileId,
      user: req.user._id,
      isActive: true,
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile selected successfully",
      profile,
    });
  } catch (error) {
    console.error("Select profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to select profile",
    });
  }
};
