import { z } from "zod";

/**
 * Zod schema for validating environment variables.
 * Ensures all required secrets and configuration are present at startup.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Auth secrets (at least one must be provided, min 32 chars)
  AUTH_SECRET: z
    .string()
    .min(32, "AUTH_SECRET must be at least 32 characters")
    .optional(),
  NEXTAUTH_SECRET: z
    .string()
    .min(32, "NEXTAUTH_SECRET must be at least 32 characters")
    .optional(),

  // Database connection
  APP_DATABASE_URL: z.string().url().optional(),

  // Google OAuth (required for authentication)
  AUTH_GOOGLE_ID: z.string().min(1, "AUTH_GOOGLE_ID is required"),
  AUTH_GOOGLE_SECRET: z.string().min(1, "AUTH_GOOGLE_SECRET is required"),

  // Application URL
  NEXTAUTH_URL: z.string().optional(),
});

/**
 * Validates all environment variables.
 *
 * In production: Throws error if required variables are missing.
 * In development: Logs warnings but continues (for local dev convenience).
 *
 * @throws {Error} In production if required environment variables are missing
 * @returns Validated environment variables
 */
export function validateEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const errors = parsed.error.errors;
    const errorMessages = errors
      .map((e) => `- ${e.path.join(".")}: ${e.message}`)
      .join("\n");

    if (process.env.NODE_ENV === "production") {
      throw new Error(
        `❌ Missing required environment variables:\n${errorMessages}\n\n` +
          `Please set all required environment variables before starting production server.\n` +
          `See .env.example for the complete list.`
      );
    }

    console.warn(
      `⚠️  Development mode: Some environment variables are missing:\n${errorMessages}`
    );
  }

  // Check that at least one auth secret is provided
  const hasAuthSecret = parsed.success && (parsed.data.AUTH_SECRET || parsed.data.NEXTAUTH_SECRET);

  if (!hasAuthSecret && process.env.NODE_ENV === "production") {
    throw new Error(
      "❌ AUTH_SECRET or NEXTAUTH_SECRET must be set in production (min 32 characters).\n" +
        'Generate one with: openssl rand -base64 32'
    );
  }

  if (!hasAuthSecret) {
    console.warn(
      "⚠️  No AUTH_SECRET or NEXTAUTH_SECRET set. Using temporary development secret.\n" +
        'For production, generate one with: openssl rand -base64 32'
    );
  }

  return parsed.success ? parsed.data : undefined;
}

/**
 * Validate environment on module import.
 * This ensures we fail fast in production if configuration is invalid.
 */
validateEnv();
