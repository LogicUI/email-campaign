import { requireAppUser } from "@/api/_lib/app-user";
import { successResponse } from "@/api/_lib/api-response";
import { withApiHandler } from "@/api/_lib/error-handler";
import { ValidationError } from "@/core/errors/error-classes";
import { listPostgresTables } from "@/core/database/postgres-connector";
import { getZodErrorMessage } from "@/zodSchemas/api";
import { listDatabaseTablesRequestSchema } from "@/zodSchemas/database";

export const POST = withApiHandler(async (request: Request) => {
  const auth = await requireAppUser();

  if ("response" in auth) {
    return auth.response;
  }

  const body = await request.json();
  const parsedPayload = listDatabaseTablesRequestSchema.safeParse(body);

  if (!parsedPayload.success) {
    throw new ValidationError(getZodErrorMessage(parsedPayload.error));
  }

  const tables = await listPostgresTables(parsedPayload.data.connection);

  return successResponse({
    tables,
  });
});
