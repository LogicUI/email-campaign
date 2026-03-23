import { requireAppUser } from "@/api/_lib/app-user";
import { successResponse } from "@/api/_lib/api-response";
import { withApiHandler } from "@/api/_lib/error-handler";
import { ValidationError } from "@/core/errors/error-classes";
import {
  listPostgresTables,
  normalizeConnectionProfile,
  testPostgresConnection,
} from "@/core/database/postgres-connector";
import { upsertConnectionProfile } from "@/core/persistence/connection-profiles-repo";
import { getZodErrorMessage } from "@/zodSchemas/api";
import { testDatabaseConnectionRequestSchema } from "@/zodSchemas/database";

export const POST = withApiHandler(async (request: Request) => {
  const auth = await requireAppUser();

  if ("response" in auth) {
    return auth.response;
  }

  const body = await request.json();
  const parsedPayload = testDatabaseConnectionRequestSchema.safeParse(body);

  if (!parsedPayload.success) {
    throw new ValidationError(getZodErrorMessage(parsedPayload.error));
  }

  const data = parsedPayload.data;
  let profile: Awaited<ReturnType<typeof upsertConnectionProfile>>;
  let tables: Awaited<ReturnType<typeof listPostgresTables>>;

  try {
    await testPostgresConnection(data.connection);
    const metadata = normalizeConnectionProfile(data.connection);
    profile = await upsertConnectionProfile({
      userId: auth.userId,
      provider: data.connection.provider,
      label: metadata.label,
      displayHost: metadata.displayHost,
      displayDatabaseName: metadata.displayDatabaseName,
      displayProjectRef: metadata.displayProjectRef,
      syncMode: data.connection.syncMode,
    });
    tables = await listPostgresTables(data.connection);
  } catch (error) {
    throw new ValidationError(
      error instanceof Error ? error.message : "Database connection failed."
    );
  }

  return successResponse({
    connectionProfile: profile,
    tables,
  });
});
