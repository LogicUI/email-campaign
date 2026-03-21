import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./app/core/persistence/schema.ts",
  out: "./app/core/persistence/migrations",
  dbCredentials: {
    url:
      process.env.APP_DATABASE_URL ??
      "postgresql://postgres:postgres@127.0.0.1:5432/emailai",
  },
});
