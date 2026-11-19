const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

// Usage: router.get("/:movieId", validateObjectId("movieId"), getMovie)
// Bad IDs get a 400 instead of crashing Mongoose with a CastError (500).
export const validateObjectId =
  (...paramNames) =>
  (req, res, next) => {
    for (const name of paramNames) {
      if (!OBJECT_ID.test(String(req.params[name] ?? ""))) {
        return res.status(400).json({
          success: false,
          message: `Invalid ${name}`,
        });
      }
    }
    next();
  };

export default validateObjectId;
