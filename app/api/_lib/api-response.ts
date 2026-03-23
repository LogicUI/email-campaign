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
function errorResponse(
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

