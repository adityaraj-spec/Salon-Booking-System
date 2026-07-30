import ApiError from "../utils/apiError.js";

export class NotFoundError extends ApiError {
  constructor(message = "Resource not found") {
    super(404, message);
    this.code = "NOT_FOUND";
  }
}

export class ValidationError extends ApiError {
  constructor(message = "Validation failed", errors = []) {
    super(400, message, errors);
    this.code = "VALIDATION_ERROR";
  }
}

export class ConflictError extends ApiError {
  constructor(message = "Resource conflict") {
    super(409, message);
    this.code = "CONFLICT";
  }
}

export class AuthorizationError extends ApiError {
  constructor(message = "Forbidden access") {
    super(403, message);
    this.code = "FORBIDDEN";
  }
}

export class AuthenticationError extends ApiError {
  constructor(message = "Unauthorized request") {
    super(401, message);
    this.code = "UNAUTHORIZED";
  }
}

export class PaymentError extends ApiError {
  constructor(message = "Payment processing error", errors = []) {
    super(402, message, errors);
    this.code = "PAYMENT_ERROR";
  }
}
