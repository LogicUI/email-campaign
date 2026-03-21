import { successResponse, withApiHandler } from "@/api/_lib/api-response";
import { AuthenticationError, ValidationError } from "@/core/errors/error-classes";
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
    throw new AuthenticationError("Authentication required");
  }

  const body = await request.json();
  const parsedPayload = testDatabaseConnectionRequestSchema.safeParse(body);

  if (!parsedPayload.success) {
    throw new ValidationError(getZodErrorMessage(parsedPayload.error));
  }

  const data = parsedPayload.data;
  await testPostgresConnection(data.connection);
  const metadata = normalizeConnectionProfile(data.connection);
  const profile = await upsertConnectionProfile({
    userId: auth.userId,
    provider: data.connection.provider,
    label: metadata.label,
    displayHost: metadata.displayHost,
    displayDatabaseName: metadata.displayDatabaseName,
    displayProjectRef: metadata.displayProjectRef,
    syncMode: data.connection.syncMode,
  });
  const tables = await listPostgresTables(data.connection);

  return successResponse({
    connectionProfile: profile,
    tables,
  });
});
