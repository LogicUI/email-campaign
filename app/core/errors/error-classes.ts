/**
 * Error classification system.
 *
 * Provides typed error classes with consistent structure for error handling.
 * All errors include correlation IDs for tracking across logs and monitoring.
 */

import { generateCorrelationId } from "./correlation-id";

/**
 * Base application error class.
 *
 * All custom errors should extend this class.
 * Provides consistent structure: code, message, status, correlation ID, timestamp.
 */
export abstract class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly correlationId: string;
  readonly isOperational: boolean;
  readonly timestamp: string;

  constructor(
    message: string,
    code: string,
    statusCode: number,
    isOperational = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.correlationId = generateCorrelationId();
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();

    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Serialize error to JSON for logging and API responses.
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      correlationId: this.correlationId,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Validation error (400).
 *
 * Use when user input fails validation or business logic constraints.
 */
export class ValidationError extends AppError {
  constructor(message: string, public field?: string) {
    super(message, "VALIDATION_ERROR", 400);
  }
}

/**
 * Authentication error (401).
 *
 * Use when user is not authenticated or session has expired.
 */
export class AuthenticationError extends AppError {
  constructor(message = "Authentication required") {
    super(message, "AUTHENTICATION_ERROR", 401);
  }
}

/**
 * Authorization error (403).
 *
 * Use when user is authenticated but lacks permission for an action.
 */
export class AuthorizationError extends AppError {
  constructor(message = "Insufficient permissions") {
    super(message, "AUTHORIZATION_ERROR", 403);
  }
}

/**
 * Not found error (404).
 *
 * Use when a requested resource doesn't exist.
 */
export class NotFoundError extends AppError {
  constructor(resource: string = "Resource") {
    super(`${resource} not found`, "NOT_FOUND_ERROR", 404);
  }
}

/**
 * Conflict error (409).
 *
 * Use when a request conflicts with existing state (e.g., duplicate entry).
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, "CONFLICT_ERROR", 409);
  }
}

/**
 * Rate limit error (429).
 *
 * Use when a user exceeds rate limits.
 */
export class RateLimitError extends AppError {
  constructor(
    message = "Rate limit exceeded",
    public retryAfter?: number
  ) {
    super(message, "RATE_LIMIT_ERROR", 429);
  }
}

/**
 * Internal server error (500).
 *
 * Use for unexpected server errors.
 * These should be logged and investigated.
 */
export class InternalServerError extends AppError {
  constructor(message = "An unexpected error occurred") {
    super(message, "INTERNAL_SERVER_ERROR", 500, false);
  }
}

/**
 * Service unavailable error (503).
 *
 * Use when a required service is down (e.g., database, external API).
 */
export class ServiceUnavailableError extends AppError {
  constructor(message = "Service temporarily unavailable") {
    super(message, "SERVICE_UNAVAILABLE_ERROR", 503, false);
  }
}

/**
 * Check if an error is an operational error (expected vs unexpected).
 *
 * Operational errors are expected business logic errors (validation, auth, etc).
 * Non-operational errors are unexpected bugs (programming errors, system failures).
 *
 * @param error - Error to check
 * @returns True if error is operational
 */
export function isOperationalError(error: unknown): error is AppError {
  return error instanceof AppError && error.isOperational;
}

/**
 * Get HTTP status code from an error.
 *
 * @param error - Error to extract status from
 * @returns HTTP status code (500 for unknown errors)
 */
export function getErrorStatusCode(error: unknown): number {
  if (error instanceof AppError) {
    return error.statusCode;
  }

  // Default to 500 for unknown errors
  return 500;
}

/**
 * Sanitize error message for client responses.
 *
 * In production, this hides sensitive implementation details.
 * In development, full error details are shown for debugging.
 *
 * @param error - Error to sanitize
 * @returns Sanitized error message
 */
export function sanitizeErrorMessage(error: unknown): string {
  const isDev = process.env.NODE_ENV === "development";

  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof Error) {
    // In development, show full error details
    if (isDev) {
      return error.message;
    }
    // In production, show generic message
    return "An unexpected error occurred";
  }

  // Non-Error objects
  if (isDev) {
    return String(error);
  }

  return "An unexpected error occurred";
}
