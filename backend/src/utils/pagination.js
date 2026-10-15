/**
 * Formats data and pagination metadata into a standardized response shape.
 */
export const formatPaginatedResponse = ({ data, totalItems, page = 1, limit = 10 }) => {
  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const pageLimit = Math.max(1, parseInt(limit, 10) || 10);
  const totalPages = Math.ceil(totalItems / pageLimit) || 1;

  return {
    data,
    pagination: {
      totalItems,
      totalPages,
      currentPage,
      limit: pageLimit,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1,
    },
  };
};
