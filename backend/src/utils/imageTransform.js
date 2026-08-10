/**
 * imageTransform.js — Cloudinary image transformation & responsive image helpers (Part 6).
 */

/**
 * Transforms a raw Cloudinary URL to add auto format (f_auto), auto quality (q_auto),
 * and width constraints.
 *
 * @param {string} rawUrl - e.g. "https://res.cloudinary.com/demo/image/upload/v12345/sample.jpg"
 * @param {object} [options]
 * @param {number} [options.width=640] - target width in px
 * @param {string} [options.quality="auto:good"] - Cloudinary quality setting
 * @returns {string} Optimized image URL
 */
export const transformImageUrl = (rawUrl, { width = 640, quality = "auto:good" } = {}) => {
  if (!rawUrl || typeof rawUrl !== "string") return rawUrl;
  if (!rawUrl.includes("cloudinary.com")) return rawUrl;

  const transformSegment = `f_auto,q_auto:${quality},w_${width}`;
  
  if (rawUrl.includes("/image/upload/")) {
    return rawUrl.replace("/image/upload/", `/image/upload/${transformSegment}/`);
  }
  
  return rawUrl;
};

/**
 * Generates a standard HTML `srcset` attribute value for responsive image rendering.
 *
 * @param {string} rawUrl
 * @param {number[]} [widths=[320, 640, 1280]]
 * @returns {string} e.g. "url_320.jpg 320w, url_640.jpg 640w, url_1280.jpg 1280w"
 */
export const getResponsiveSrcSet = (rawUrl, widths = [320, 640, 1280]) => {
  if (!rawUrl || typeof rawUrl !== "string" || !rawUrl.includes("cloudinary.com")) {
    return "";
  }

  return widths
    .map((w) => `${transformImageUrl(rawUrl, { width: w })} ${w}w`)
    .join(", ");
};
