import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.APP_DATABASE_URL;

if (!databaseUrl) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "❌ APP_DATABASE_URL environment variable is required in production.\n" +
        "Example: postgresql://user:password@host:port/database"
    );
  }
  console.warn(
    "⚠️  APP_DATABASE_URL not set. Database operations will fail.\n" +
      "Set APP_DATABASE_URL in your .env file."
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./app/core/persistence/schema.ts",
  out: "./app/core/persistence/migrations",
  dbCredentials: {
    url: databaseUrl ?? "postgresql://localhost:5432/emailai", // Fallback will cause connection error
  },
});
