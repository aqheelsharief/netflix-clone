import multer from "multer";
import crypto from "crypto";
import fs from "fs";
import HttpError from "../utils/HttpError.js";
import { VIDEO_DIR, deleteFileQuietly } from "../config/paths.js";

fs.mkdirSync(VIDEO_DIR, { recursive: true });

// The extension is chosen by US from the mime type, never taken from the
// client's filename (a ".html" file renamed to .mp4 must not be served as HTML).
// These are the mime types browsers really send.
const MIME_TO_EXT = {
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
  "video/x-matroska": ".mkv",
  "video/mpeg": ".mpeg",
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, VIDEO_DIR),
  filename: (req, file, cb) => {
    cb(null, `video-${crypto.randomUUID()}${MIME_TO_EXT[file.mimetype]}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (MIME_TO_EXT[file.mimetype]) return cb(null, true);
  cb(
    new HttpError(
      400,
      "Invalid file type. Allowed: MP4, WebM, MOV, MKV, MPEG.",
    ),
  );
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
    files: 1,
  },
});

/*
| The mime type comes from the client, so it can be faked. After multer saves
| the file we check the first bytes ("magic bytes") really look like a video.
*/
const MP4_ATOMS = ["ftyp", "moov", "mdat", "free", "wide", "skip"];

const looksLikeVideo = (mime, bytes) => {
  const atom = bytes.length >= 8 ? bytes.toString("latin1", 4, 8) : "";
  const isIsoBase = MP4_ATOMS.includes(atom);
  const isEbml =
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3;
  const isMpeg =
    (bytes[0] === 0x00 &&
      bytes[1] === 0x00 &&
      bytes[2] === 0x01 &&
      (bytes[3] === 0xba || bytes[3] === 0xb3)) ||
    bytes[0] === 0x47; // MPEG transport stream sync byte

  switch (mime) {
    case "video/mp4":
    case "video/quicktime":
      return isIsoBase;
    case "video/webm":
    case "video/x-matroska":
      return isEbml;
    case "video/mpeg":
      return isMpeg;
    default:
      return false;
  }
};

/*
| Put this right AFTER upload.single("video"). It also guarantees that if the
| request ends with an error (validation failed, movie not found, DB error...)
| the file that was just uploaded is deleted, so no orphan files pile up.
*/
export const verifyVideoUpload = async (req, res, next) => {
  if (!req.file) return next();

  res.on("finish", () => {
    if (res.statusCode >= 400) deleteFileQuietly(req.file.path);
  });

  try {
    const handle = await fs.promises.open(req.file.path, "r");
    const buffer = Buffer.alloc(16);
    const { bytesRead } = await handle.read(buffer, 0, 16, 0);
    await handle.close();

    if (!looksLikeVideo(req.file.mimetype, buffer.subarray(0, bytesRead))) {
      return next(
        new HttpError(400, "File content does not match a supported video."),
      );
    }
    next();
  } catch (error) {
    next(error);
  }
};

export default upload;
