import { useEffect } from "react";

/**
 * Custom hook to update document title and meta description dynamically
 * for SEO, accessibility, and clean browser tab UX.
 *
 * @param {string} title - Page specific title (e.g., "Discover Salons")
 * @param {string} [description] - Optional meta description for search engines
 */
export function useDocumentTitle(title, description) {
  useEffect(() => {
    const prevTitle = document.title;
    const baseTitle = "SalonNow • Modern Salon Booking & Live Line";
    
    document.title = title ? `${title} | SalonNow` : baseTitle;

    // Update or create meta description
    let metaTag = document.querySelector('meta[name="description"]');
    const prevDescription = metaTag ? metaTag.getAttribute("content") : "";

    if (description) {
      if (!metaTag) {
        metaTag = document.createElement("meta");
        metaTag.setAttribute("name", "description");
        document.head.appendChild(metaTag);
      }
      metaTag.setAttribute("content", description);
    }

    return () => {
      document.title = prevTitle;
      if (metaTag && prevDescription) {
        metaTag.setAttribute("content", prevDescription);
      }
    };
  }, [title, description]);
}

export default useDocumentTitle;

