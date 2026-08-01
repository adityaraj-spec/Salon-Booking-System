import multer from "multer";
import fs from "fs";
import path from "path";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Magic byte signatures for allowed image types.
 * These bytes are at the start of every valid file of that type,
 * regardless of what the Content-Type header or file extension claims.
 *
 * Gap 1.3 fix: Validate file content signature, not just MIME type header.
 * A malicious user can rename a .php or .svg file to .jpg — checking the magic
 * bytes prevents this attack vector.
 */
const MAGIC_BYTES = {
  "image/jpeg": [
    [0xff, 0xd8, 0xff], // JPEG/JPG
  ],
  "image/png": [
    [0x89, 0x50, 0x4e, 0x47], // PNG
  ],
  "image/webp": [
    // WebP: RIFF....WEBP (bytes 0-3 are RIFF, bytes 8-11 are WEBP)
    [0x52, 0x49, 0x46, 0x46], // "RIFF" — partial check; full check done below
  ],
};

const validateMagicBytes = (filePath, mimetype) => {
  try {
    const fd = fs.openSync(filePath, "r");
    const buffer = Buffer.alloc(12);
    fs.readSync(fd, buffer, 0, 12, 0);
    fs.closeSync(fd);

    const signatures = MAGIC_BYTES[mimetype];
    if (!signatures) return false;

    const matched = signatures.some((sig) =>
      sig.every((byte, idx) => buffer[idx] === byte)
    );

    // Extra check for WebP: bytes 8-11 must be "WEBP"
    if (mimetype === "image/webp" && matched) {
      const webpMark = buffer.slice(8, 12).toString("ascii");
      return webpMark === "WEBP";
    }

    return matched;
  } catch {
    return false;
  }
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    // Sanitize original name — only allow alphanumeric, dots, hyphens
    const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9.-]/g, "_");
    cb(null, `${uniqueSuffix}-${safeName}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
    return cb(new Error("Invalid file type. Only JPEG, PNG, and WebP images are allowed."), false);
  }
  // Note: Magic byte validation happens post-upload via the validateUploadedFile middleware
  // because multer fileFilter runs before the file is fully written to disk.
  cb(null, true);
};

export const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});

/**
 * Gap 1.3 — Post-upload magic byte validation middleware.
 * Apply this after multer's upload middleware. If the file signature does not match
 * its declared MIME type, the temp file is deleted and a 400 error is thrown.
 *
 * Usage in routes:
 *   router.post("/add", verifyJWT, upload.single("profilePic"), validateUploadedFiles, addStaff);
 */
export const validateUploadedFiles = (req, res, next) => {
  const files = req.files || (req.file ? [req.file] : []);

  for (const file of files) {
    const isValid = validateMagicBytes(file.path, file.mimetype);
    if (!isValid) {
      // Clean up the suspicious file immediately
      try { fs.unlinkSync(file.path); } catch { /* ignore cleanup error */ }
      return next(new Error(
        `File "${file.originalname}" failed magic byte validation. ` +
        "The file content does not match its declared type."
      ));
    }
  }

  next();
};

/**
 * Deletes a temp file after it has been uploaded to Cloudinary.
 * Call this in a finally block in your Cloudinary upload utilities.
 */
export const cleanupTempFile = (filePath) => {
  if (filePath) {
    try { fs.unlinkSync(filePath); } catch { /* ignore */ }
  }
};