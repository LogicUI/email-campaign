import { successResponse, withApiHandler } from "@/api/_lib/api-response";
import { AuthenticationError, ValidationError } from "@/core/errors/error-classes";
import { testPostgresConnection } from "@/core/database/postgres-connector";
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

  await testPostgresConnection(parsedPayload.data.connection);

  return successResponse({
    reachable: true,
  });
});
