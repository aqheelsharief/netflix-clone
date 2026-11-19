import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Absolute paths, so uploads work no matter which folder you start the server from.
export const UPLOAD_ROOT = path.resolve(__dirname, "..", "uploads");
export const VIDEO_DIR = path.join(UPLOAD_ROOT, "videos");
export const VIDEO_URL_PREFIX = "/uploads/videos/";

export const videoUrlFor = (filename) => `${VIDEO_URL_PREFIX}${filename}`;

// "/uploads/videos/x.mp4" -> absolute file path.
// Returns null for anything else (external URLs, path tricks) so we can never
// delete a file outside VIDEO_DIR.
export const resolveVideoFile = (videoUrl) => {
  if (typeof videoUrl !== "string" || !videoUrl.startsWith(VIDEO_URL_PREFIX)) {
    return null;
  }
  const absolute = path.resolve(VIDEO_DIR, path.basename(videoUrl));
  return absolute.startsWith(VIDEO_DIR + path.sep) ? absolute : null;
};

export const deleteFileQuietly = async (absolutePath) => {
  try {
    await fs.promises.unlink(absolutePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Could not delete file:", absolutePath, error.message);
    }
  }
};

export const deleteVideoByUrl = async (videoUrl) => {
  const file = resolveVideoFile(videoUrl);
  if (file) await deleteFileQuietly(file);
};
