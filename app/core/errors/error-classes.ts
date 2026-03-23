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

