import { searchSalonsNearby } from "../../services/search.service.js";

/**
 * SearchPublicAPI — Contracted search boundary for external & internal consumers (Part 3 & 4).
 * Enforces structured schema inputs and acts as gateway to OpenSearch / MongoDB search engine.
 */
export const SearchPublicAPI = {
  /**
   * Search salons with geo, text, rating, and pagination filters.
   */
  async search(params) {
    return await searchSalonsNearby(params);
  },
};
