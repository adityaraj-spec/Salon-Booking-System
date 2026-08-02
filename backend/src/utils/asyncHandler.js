import logger from "../lib/logger.js";

const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => {
      // Log at error level — stack trace + request context auto-injected via mixin
      logger.error({ err: err.message, stack: err.stack }, "[AsyncHandler] Unhandled controller error");
      next(err);
    });
  };
};

export { asyncHandler };