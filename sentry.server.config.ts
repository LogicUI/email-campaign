/**
 * Sentry Server-Side Configuration
 *
 * This file configures Sentry for server-side error tracking.
 * It captures errors in API routes, server components, and server actions.
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",

  // Adjust sampling rate before production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Capture replay sessions with errors
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Filter sensitive data
  beforeSend(event, hint) {
    // Remove user email from events (PII protection)
    if (event.user?.email) {
      delete event.user.email;
    }

    // Don't send events in development if SENTRY_DSN is not set
    if (process.env.NODE_ENV === "development" && !process.env.SENTRY_DSN) {
      console.error("Development mode - error not sent to Sentry:", event);
      return null;
    }

    return event;
  },

  // Ignore specific errors
  ignoreErrors: [
    // Browser extensions
    "top.GLOBALS",
    // Random plugins/extensions
    "originalCreateNotification",
    "canvas.contentDocument",
    "MyApp_RemoveAllHighlights",
  ],

  // Filter transactions
  beforeSendTransaction(event) {
    // Filter out health check transactions
    if (event.transaction?.includes("/health")) {
      return null;
    }

    return event;
  },

  // Integrations
  integrations: [],

  // Attach correlation IDs from our error system
  // (This will be enhanced when we integrate with our error classes)
});
