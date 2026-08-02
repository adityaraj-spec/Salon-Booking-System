/**
 * NoSQL Injection Protection Middleware
 * Recursively strips keys starting with '$' or containing '.' from req.body, req.query, and req.params.
 */
import logger from "../lib/logger.js";
const sanitizeValue = (data) => {
  if (data instanceof Date || data instanceof RegExp) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeValue(item));
  }

  if (data !== null && typeof data === "object") {
    const cleanObj = {};
    for (const key of Object.keys(data)) {
      // Remove keys with Mongo operators or dot notation
      if (key.startsWith("$") || key.includes(".")) {
        logger.warn({ key }, "[NoSQL Sanitizer] Stripped suspicious key from request input");
        continue;
      }
      cleanObj[key] = sanitizeValue(data[key]);
    }
    return cleanObj;
  }

  return data;
};

const sanitizeInPlace = (obj) => {
  if (!obj || typeof obj !== "object") return;
  for (const key of Object.keys(obj)) {
    if (key.startsWith("$") || key.includes(".")) {
      logger.warn({ key }, "[NoSQL Sanitizer] Stripped suspicious key from request input");
      delete obj[key];
    } else if (typeof obj[key] === "object" && obj[key] !== null) {
      sanitizeInPlace(obj[key]);
    }
  }
};

export const sanitizeNoSQL = (req, res, next) => {
  try {
    if (req.body) req.body = sanitizeValue(req.body);
    if (req.query) sanitizeInPlace(req.query);
    if (req.params) sanitizeInPlace(req.params);
    next();
  } catch (err) {
    next(err);
  }
};
