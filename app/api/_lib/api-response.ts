/**
 * API response helper functions.
 *
 * Provides consistent response formatting for all API endpoints.
 * Maintains the existing response format: { ok: boolean, data?, error?, code? }
 */

import { NextResponse } from "next/server";
import type { Session } from "next-auth";

import { generateCorrelationId } from "@/core/errors/correlation-id";

/**
 * Standard success response format.
 */
interface SuccessResponse<T = unknown> {
  ok: true;
  data: T;
}

/**
 * Standard error response format.
 */
interface ErrorResponse {
  ok: false;
  error: string;
  code?: string;
  correlationId?: string;
}

/**
 * Create a success response.
 *
 * @param data - Response data
 * @param status - HTTP status code (default: 200)
 * @returns NextResponse with success format
 *
 * @example
 * ```ts
 * return successResponse({ userId: '123', name: 'John' });
 * // { ok: true, data: { userId: '123', name: 'John' } }
 *
 * return successResponse({ created: true }, 201);
 * // { ok: true, data: { created: true } } with status 201
 * ```
 */
export function successResponse<T = unknown>(
  data: T,
  status: number = 200
): NextResponse<SuccessResponse<T>> {
  return NextResponse.json({ ok: true, data }, { status });
}

/**
 * Create an error response.
 *
 * @param message - Error message
 * @param code - Error code (optional)
 * @param status - HTTP status code (default: 400)
 * @param correlationId - Correlation ID (optional, will be generated if not provided)
 * @returns NextResponse with error format
 *
 * @example
 * ```ts
 * return errorResponse('Invalid input', 'VALIDATION_ERROR', 400);
 * // { ok: false, error: 'Invalid input', code: 'VALIDATION_ERROR' }
 *
 * return errorResponse('Not found', 'NOT_FOUND', 404);
 * // { ok: false, error: 'Not found', code: 'NOT_FOUND' } with status 404
 * ```
 */
export function errorResponse(
  message: string,
  code?: string,
  status: number = 400,
  correlationId?: string
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      code,
      correlationId: correlationId || generateCorrelationId(),
    },
    { status }
  );
}

/**
 * Create a validation error response.
 *
 * @param errors - Validation error message(s)
 * @param correlationId - Correlation ID (optional)
 * @returns NextResponse with 400 status
 *
 * @example
 * ```ts
 * return validationResponse('Email is required');
 * // { ok: false, error: 'Email is required', code: 'VALIDATION_ERROR' }
 *
 * return validationResponse(['Email is required', 'Name is too long']);
 * // { ok: false, error: 'Email is required, Name is too long', code: 'VALIDATION_ERROR' }
 * ```
 */
export function validationResponse(
  errors: string | string[],
  correlationId?: string
): NextResponse<ErrorResponse> {
  const message = Array.isArray(errors) ? errors.join(", ") : errors;
  return errorResponse(message, "VALIDATION_ERROR", 400, correlationId);
}

/**
 * Create a not found error response.
 *
 * @param resource - Resource name (default: "Resource")
 * @returns NextResponse with 404 status
 *
 * @example
 * ```ts
 * return notFoundResponse('Campaign');
 * // { ok: false, error: 'Campaign not found', code: 'NOT_FOUND' } with status 404
 * ```
 */
export function notFoundResponse(resource: string = "Resource"): NextResponse<ErrorResponse> {
  return errorResponse(`${resource} not found`, "NOT_FOUND", 404);
}

/**
 * Create an unauthorized error response.
 *
 * @param message - Error message (default: "Authentication required")
 * @returns NextResponse with 401 status
 *
 * @example
 * ```ts
 * return unauthorizedResponse();
 * // { ok: false, error: 'Authentication required', code: 'AUTHENTICATION_ERROR' } with status 401
 *
 * return unauthorizedResponse('Session expired');
 * // { ok: false, error: 'Session expired', code: 'AUTHENTICATION_ERROR' } with status 401
 * ```
 */
export function unauthorizedResponse(
  message: string = "Authentication required"
): NextResponse<ErrorResponse> {
  return errorResponse(message, "AUTHENTICATION_ERROR", 401);
}

/**
 * Create a forbidden error response.
 *
 * @param message - Error message (default: "Insufficient permissions")
 * @returns NextResponse with 403 status
 *
 * @example
 * ```ts
 * return forbiddenResponse();
 * // { ok: false, error: 'Insufficient permissions', code: 'AUTHORIZATION_ERROR' } with status 403
 * ```
 */
export function forbiddenResponse(
  message: string = "Insufficient permissions"
): NextResponse<ErrorResponse> {
  return errorResponse(message, "AUTHORIZATION_ERROR", 403);
}

/**
 * Create a conflict error response.
 *
 * @param message - Error message
 * @returns NextResponse with 409 status
 *
 * @example
 * ```ts
 * return conflictResponse('Email already exists');
 * // { ok: false, error: 'Email already exists', code: 'CONFLICT_ERROR' } with status 409
 * ```
 */
export function conflictResponse(message: string): NextResponse<ErrorResponse> {
  return errorResponse(message, "CONFLICT_ERROR", 409);
}

/**
 * Create a rate limit exceeded response.
 *
 * @param retryAfter - Seconds until retry is allowed (optional)
 * @returns NextResponse with 429 status
 *
 * @example
 * ```ts
 * return rateLimitResponse(60);
 * // { ok: false, error: 'Rate limit exceeded', code: 'RATE_LIMIT_ERROR', retryAfter: 60 } with status 429
 * ```
 */
export function rateLimitResponse(retryAfter?: number): NextResponse<ErrorResponse> {
  const response = errorResponse(
    "Rate limit exceeded. Please try again later.",
    "RATE_LIMIT_ERROR",
    429
  );

  if (retryAfter) {
    response.headers.set("Retry-After", retryAfter.toString());
  }

  return response;
}

/**
 * Create an internal server error response.
 *
 * @param message - Error message (default: "An unexpected error occurred")
 * @returns NextResponse with 500 status
 *
 * @example
 * ```ts
 * return internalServerErrorResponse();
 * // { ok: false, error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' } with status 500
 *
 * return internalServerErrorResponse('Database connection failed');
 * // In development: Shows full message
 * // In production: Shows generic message
 * ```
 */
export function internalServerErrorResponse(
  message: string = "An unexpected error occurred"
): NextResponse<ErrorResponse> {
  // In production, don't leak implementation details
  const isDev = process.env.NODE_ENV === "development";
  const sanitizedMessage = isDev ? message : "An unexpected error occurred";

  return errorResponse(sanitizedMessage, "INTERNAL_ERROR", 500);
}

/**
 * Add correlation ID to response headers.
 *
 * @param response - NextResponse object
 * @param correlationId - Correlation ID to add
 * @returns Response with X-Correlation-ID header
 *
 * @example
 * ```ts
 * const response = successResponse({ data: 'result' });
 * return addCorrelationIdToResponse(response, correlationId);
 * ```
 */
export function addCorrelationIdToResponse<T>(
  response: NextResponse<T>,
  correlationId: string
): NextResponse<T> {
  response.headers.set("X-Correlation-ID", correlationId);
  return response;
}
