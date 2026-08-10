/**
 * cacheControl.js — Cache-Control HTTP header middleware for edge/browser caching (Part 6.2).
 */

/**
 * Creates middleware setting Cache-Control headers on successful GET responses.
 *
 * @param {number} [maxAgeSeconds=60] - max-age in seconds for public caching
 * @param {number} [staleWhileRevalidateSeconds=30] - stale-while-revalidate duration in seconds
 */
export const setCacheHeaders = (maxAgeSeconds = 60, staleWhileRevalidateSeconds = 30) => {
  return (req, res, next) => {
    if (req.method === "GET") {
      res.setHeader(
        "Cache-Control",
        `public, max-age=${maxAgeSeconds}, stale-while-revalidate=${staleWhileRevalidateSeconds}`
      );
    }
    next();
  };
};

/**
 * Middleware ensuring response is explicitly not cached (for sensitive/reservation paths).
 */
export const noCacheHeader = (req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
};
