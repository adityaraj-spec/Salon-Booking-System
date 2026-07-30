import ApiError from "../utils/apiError.js";

/**
 * Zod Validation Middleware Factory
 * @param {import('zod').ZodTypeAny | { body?: import('zod').ZodTypeAny, query?: import('zod').ZodTypeAny, params?: import('zod').ZodTypeAny }} schema
 */
export const validate = (schema) => async (req, res, next) => {
  try {
    if (schema.body && req.body) {
      req.body = await schema.body.parseAsync(req.body);
    }
    if (schema.query && req.query) {
      req.query = await schema.query.parseAsync(req.query);
    }
    if (schema.params && req.params) {
      req.params = await schema.params.parseAsync(req.params);
    }
    next();
  } catch (error) {
    if (error.name === "ZodError" || error.issues) {
      const formattedErrors = error.issues?.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      })) || [];
      
      const firstErrorMessage = formattedErrors[0]?.message || "Validation Error";
      return next(new ApiError(400, `Validation Failed: ${firstErrorMessage}`, formattedErrors));
    }
    next(error);
  }
};
