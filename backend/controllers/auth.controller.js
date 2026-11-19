import bcrypt from "bcrypt";
import User from "../models/User.js";
import Profile from "../models/Profile.js";
import generateToken from "../utils/generateToken.js";
import HttpError from "../utils/HttpError.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PROFILE_NAME_MAX = 30; // Profile.name allows 30, User.name allows 50

// Used so a "user not found" login takes as long as a "wrong password" login.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  isActive: user.isActive,
  createdAt: user.createdAt,
  role: user.role,
});

const getActiveProfiles = (userId) =>
  Profile.find({ user: userId, isActive: true }).sort({ createdAt: 1 });

export const register = async (req, res) => {
  const { name, email, password } = req.body ?? {};

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    !name.trim() ||
    !email.trim() ||
    !password
  ) {
    throw new HttpError(400, "Please fill all the details");
  }

  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();

  if (cleanName.length < 2 || cleanName.length > 50) {
    throw new HttpError(400, "Name must be between 2 and 50 characters");
  }

  if (!EMAIL_REGEX.test(cleanEmail)) {
    throw new HttpError(400, "Please enter a valid email address");
  }

  // bcrypt only uses the first 72 bytes of a password.
  if (password.length < 6 || password.length > 72) {
    throw new HttpError(400, "Password must be between 6 and 72 characters");
  }

  if (await User.findOne({ email: cleanEmail })) {
    throw new HttpError(409, "User already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  // Two people registering the same email at the same moment: the unique index
  // rejects the second one (Mongo error 11000), which the error handler maps to 409.
  const user = await User.create({
    name: cleanName,
    email: cleanEmail,
    password: hashedPassword,
  });

  let profiles;
  try {
    profiles = await Profile.insertMany([
      {
        user: user._id,
        name: cleanName.slice(0, PROFILE_NAME_MAX),
        avatar: "",
        isKids: false,
        language: "English",
        maturityLevel: "All",
      },
      {
        user: user._id,
        name: "Kids",
        avatar: "",
        isKids: true,
        language: "English",
        maturityLevel: "7+",
      },
    ]);
  } catch (error) {
    // Don't leave a user behind who has no profiles (they could never retry).
    await User.deleteOne({ _id: user._id });
    throw error;
  }

  res.status(201).json({
    success: true,
    message: "Account created successfully",
    token: generateToken(user._id),
    user: sanitizeUser(user),
    profiles,
  });
};

export const login = async (req, res) => {
  const { email, password } = req.body ?? {};

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    !password
  ) {
    throw new HttpError(400, "Please fill all the details");
  }

  const user = await User.findOne({
    email: email.trim().toLowerCase(),
  }).select("+password");

  const passwordMatches = await bcrypt.compare(
    password,
    user ? user.password : DUMMY_HASH,
  );

  if (!user || !passwordMatches) {
    throw new HttpError(401, "Invalid email or password");
  }

  if (!user.isActive) {
    throw new HttpError(403, "This account has been disabled");
  }

  // updateOne instead of save(): no need to re-validate the whole document.
  await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });

  res.status(200).json({
    success: true,
    message: "Login successful",
    token: generateToken(user._id),
    user: sanitizeUser(user),
    profiles: await getActiveProfiles(user._id),
  });
};

export const getMe = async (req, res) => {
  // protect already loaded the user, no need to query again.
  res.status(200).json({
    success: true,
    message: "Session is valid",
    user: sanitizeUser(req.user),
    profiles: await getActiveProfiles(req.user._id),
  });
};
