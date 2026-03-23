/**
 * Centralized API error handler.
 *
 * Catches all errors from API routes, logs them to Sentry,
 * and returns appropriate HTTP responses with consistent format.
 */

import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import type { ZodError } from "zod";

import {
  AppError,
  InternalServerError,
} from "@/core/errors/error-classes";
import { generateCorrelationId } from "@/core/errors/correlation-id";

/**
 * Flatten Zod error into a readable message.
 */
function flattenZodError(error: ZodError): string {
  return error.issues
    .map((e) => `${e.path.join(".")}: ${e.message}`)
    .join(", ");
}

/**
 * Log error to Sentry with context.
 */
function logError(error: unknown, context: Record<string, unknown>) {
  const correlationId = context.correlationId as string;

  // Send to Sentry with context
  Sentry.captureException(error, {
    tags: {
      correlationId,
    },
    extra: context,
  });
}

/**
 * Handle API errors and return appropriate NextResponse.
 *
 * This function:
 * 1. Logs the error with context
 * 2. Determines appropriate HTTP status code
 * 3. Returns formatted error response with correlation ID
 *
 * @param error - Caught error
 * @param request - Optional request for context
 * @returns NextResponse with appropriate error status and body
 */
async function handleApiError(
  error: unknown,
  request?: Request
): Promise<NextResponse> {
  const correlationId = generateCorrelationId();

  // Log error with context
  logError(error, {
    correlationId,
    url: request?.url,
    method: request?.method,
  });

  // Handle known AppError types
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        code: error.code,
        correlationId,
      },
      { status: error.statusCode }
    );
  }

  // Handle Zod validation errors
  if (isZodError(error)) {
    return NextResponse.json(
      {
        ok: false,
        error: flattenZodError(error),
        code: "VALIDATION_ERROR",
        correlationId,
      },
      { status: 400 }
    );
  }

  // Handle unknown errors - don't leak details in production
  const isDev = process.env.NODE_ENV === "development";
  return NextResponse.json(
    {
      ok: false,
      error: isDev ? String(error) : "An unexpected error occurred",
      code: "INTERNAL_ERROR",
      correlationId,
    },
    { status: 500 }
  );
}

/**
 * Type guard to check if error is a ZodError.
 */
function isZodError(error: unknown): error is ZodError {
  return (
    typeof error === "object" &&
    error !== null &&
    "issues" in error &&
    Array.isArray((error as ZodError).issues)
  );
}

/**
 * Wrapper function for API route handlers.
 *
 * Automatically catches errors and formats responses.
 * Maintains the existing response format: { ok: boolean, data?, error?, code? }
 *
 * @param handler - Route handler function
 * @returns Wrapped handler with error handling
 *
 * @example
 * ```ts
 * import { withApiHandler } from '@/api/_lib/error-handler';
 * import { successResponse } from '@/api/_lib/api-response';
 *
 * export const POST = withApiHandler(async (request) => {
 *   const authResult = await requireApiSession();
 *   if ("response" in authResult) {
 *     throw new AuthenticationError('Authentication required');
 *   }
 *
 *   // ... route logic
 *   return successResponse({ data: 'result' });
 * });
 * ```
 */
export function withApiHandler<TContext = undefined>(
  handler: (
    request: Request,
    context: TContext
  ) => Promise<Response | NextResponse>
): (request: Request, context: TContext) => Promise<Response | NextResponse> {
  return async (
    request: Request,
    context: TContext
  ): Promise<Response | NextResponse> => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleApiError(error, request);
    }
  };
}

