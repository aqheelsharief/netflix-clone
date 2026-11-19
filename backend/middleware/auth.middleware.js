import jwt from "jsonwebtoken";
import User from "../models/User.js";

const unauthorized = (res, message) =>
  res.status(401).json({ success: false, message });

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return unauthorized(res, "Not authorized, no token");
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return unauthorized(res, "Not authorized, token missing");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return unauthorized(res, "Not authorized, user not found");
    }

    if (!user.isActive) {
      return unauthorized(res, "Not authorized, user is inactive");
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return unauthorized(res, "Session expired, please log in again");
    }

    if (error.name === "JsonWebTokenError") {
      return unauthorized(res, "Not authorized, invalid token");
    }

    // Anything else (e.g. database down) is a real server error, not a bad token.
    next(error);
  }
};

// Use AFTER protect:  router.post("/", protect, requireAdmin, handler)
export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }
  next();
};

export default protect;
