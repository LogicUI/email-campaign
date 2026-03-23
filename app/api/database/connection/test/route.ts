import { requireAppUser } from "@/api/_lib/app-user";
import { successResponse } from "@/api/_lib/api-response";
import { withApiHandler } from "@/api/_lib/error-handler";
import { ValidationError } from "@/core/errors/error-classes";
import { testPostgresConnection } from "@/core/database/postgres-connector";
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

  try {
    await testPostgresConnection(parsedPayload.data.connection);
  } catch (error) {
    throw new ValidationError(
      error instanceof Error ? error.message : "Database connection failed."
    );
  }

  return successResponse({
    reachable: true,
  });
});
