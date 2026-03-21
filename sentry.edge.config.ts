/**
 * Sentry Edge Runtime Configuration
 *
 * This file configures Sentry for Edge Runtime (middleware, edge routes).
 * It captures errors in middleware and edge functions.
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",

  // Adjust sampling rate
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Filter sensitive data
  beforeSend(event, hint) {
    // Remove PII
    if (event.user?.email) {
      delete event.user.email;
    }

    // Don't send events in development if SENTRY_DSN is not set
    if (process.env.NODE_ENV === "development" && !process.env.SENTRY_DSN) {
      return null;
    }

    return event;
  },
});
