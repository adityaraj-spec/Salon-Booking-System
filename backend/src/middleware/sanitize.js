/**
 * NoSQL Injection Protection Middleware
 * Recursively strips keys starting with '$' or containing '.' from req.body, req.query, and req.params.
 */
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
        console.warn(`[NoSQL Sanitizer] Stripped suspicious key "${key}" from request input`);
        continue;
      }
      cleanObj[key] = sanitizeValue(data[key]);
    }
    return cleanObj;
  }

  return data;
};

export const sanitizeNoSQL = (req, res, next) => {
  try {
    if (req.body) req.body = sanitizeValue(req.body);
    if (req.query) req.query = sanitizeValue(req.query);
    if (req.params) req.params = sanitizeValue(req.params);
    next();
  } catch (err) {
    next(err);
  }
};
