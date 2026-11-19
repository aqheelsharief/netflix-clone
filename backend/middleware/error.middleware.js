import multer from "multer";

export const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
};

// Express 5 forwards errors from async controllers here automatically.
export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  let status = err.status || err.statusCode || 500;
  let message = err.message || "Something went wrong";

  if (err instanceof multer.MulterError) {
    status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Video is too large (max 100MB)."
        : `Upload error: ${err.message}`;
  } else if (err.type === "entity.parse.failed") {
    status = 400;
    message = "Request body is not valid JSON";
  } else if (err.name === "ValidationError" && err.errors) {
    status = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
  } else if (err.name === "CastError") {
    status = 400;
    message = `Invalid ${err.path}`;
  } else if (err.code === 11000) {
    status = 409;
    message = "That value already exists";
  }

  if (!Number.isInteger(status) || status < 400 || status > 599) status = 500;

  if (status >= 500) {
    console.error(err);
    // Never leak internals (Mongo errors, stack hints) in production.
    if (process.env.NODE_ENV === "production") {
      message = "Internal server error";
    }
  }

  res.status(status).json({ success: false, message });
};
