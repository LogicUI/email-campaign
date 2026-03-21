/**
 * Sentry Client-Side Configuration
 *
 * This file configures Sentry for client-side error tracking.
 * It captures errors in browser JavaScript, React components, etc.
 */

import * as Sentry from "@sentry/nextjs";
import { BrowserTracing } from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Browser tracing integration
  integrations: [
    new BrowserTracing({
      // Set custom tracing options
      tracePropagationTargets: ["localhost", /^\//],
    }),
  ],

  // Filter sensitive data
  beforeSend(event, hint) {
    // Remove PII
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

  // Ignore specific errors (browser extensions, etc)
  ignoreErrors: [
    "top.GLOBALS",
    "originalCreateNotification",
    "canvas.contentDocument",
    "MyApp_RemoveAllHighlights",
    "http://tt.epicplay.com",
    "Can't find variable: ZtConverter",
    "fb_xd_fragment",
  ],

  // Ignore URLs from browser extensions
  denyUrls: [
    /graph\.facebook\.com/i,
    /connect\.facebook\.net\/en_US\/all\.js/i,
    /eatdifferent\.com\.woopra-ns\.com/i,
    /static\.woopra\.com\/js\/woopra\.js/i,
    /extensions\//i,
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
  ],
});
