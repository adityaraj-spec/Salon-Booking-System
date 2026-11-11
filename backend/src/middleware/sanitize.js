/**
 * Request Sanitization & Injection Defense Middleware
 * 
 * 1. NoSQL Injection Defense: Recursively strips keys starting with '$' or containing '.' from req.body, req.query, and req.params.
 * 2. Cross-Site Scripting (XSS) Sanitization: Strips executable script blocks, javascript: URIs, and dangerous event handlers from string inputs.
 * 3. HTTP Parameter Pollution (HPP) Defense: Flattens duplicate query parameters to prevent array injection attacks on scalar parameters.
 */
import logger from "../lib/logger.js";

/**
 * XSS Sanitizer: strips executable script tags, event handler attributes, and dangerous protocols
 */
export const sanitizeString = (str) => {
  if (typeof str !== "string") return str;
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/vbscript\s*:/gi, "")
    .replace(/data:text\/html/gi, "")
    .replace(/on\w+\s*=/gi, (match) => `_${match}`); // Neutralize onerror=, onload=, onclick=, etc.
};

export const sanitizeValue = (data) => {
  if (data instanceof Date || data instanceof RegExp) {
    return data;
  }

  if (typeof data === "string") {
    return sanitizeString(data);
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeValue(item));
  }

  if (data !== null && typeof data === "object") {
    const cleanObj = {};
    for (const key of Object.keys(data)) {
      // Remove keys with Mongo operators or dot notation
      if (key.startsWith("$") || key.includes(".")) {
        logger.warn({ key }, "[NoSQL Sanitizer] Stripped suspicious operator key from request input");
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
    } else if (typeof obj[key] === "string") {
      obj[key] = sanitizeString(obj[key]);
    } else if (typeof obj[key] === "object" && obj[key] !== null) {
      sanitizeInPlace(obj[key]);
    }
  }
};

/**
 * HTTP Parameter Pollution (HPP) protection for query parameters.
 * If a query parameter was repeated (e.g. ?page=1&page=2), selects the last element to prevent type confusion.
 */
const preventParameterPollution = (queryObj) => {
  if (!queryObj || typeof queryObj !== "object") return;
  for (const key of Object.keys(queryObj)) {
    if (Array.isArray(queryObj[key])) {
      // Keep the last value (standard HPP resolution)
      queryObj[key] = queryObj[key][queryObj[key].length - 1];
    }
  }
};

export const sanitizeNoSQL = (req, res, next) => {
  try {
    if (req.body) req.body = sanitizeValue(req.body);
    if (req.query) {
      preventParameterPollution(req.query);
      sanitizeInPlace(req.query);
    }
    if (req.params) sanitizeInPlace(req.params);
    next();
  } catch (err) {
    next(err);
  }
};
