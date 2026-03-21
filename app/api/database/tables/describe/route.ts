import { successResponse, withApiHandler } from "@/api/_lib/api-response";
import { AuthenticationError, ValidationError } from "@/core/errors/error-classes";
import {
  buildSuggestedMappings,
  describePostgresTable,
} from "@/core/database/postgres-connector";
import { getZodErrorMessage } from "@/zodSchemas/api";
import { describeDatabaseTableRequestSchema } from "@/zodSchemas/database";

export const POST = withApiHandler(async (request: Request) => {
  const auth = await requireAppUser();

  if ("response" in auth) {
    throw new AuthenticationError("Authentication required");
  }

  const body = await request.json();
  const parsedPayload = describeDatabaseTableRequestSchema.safeParse(body);

  if (!parsedPayload.success) {
    throw new ValidationError(getZodErrorMessage(parsedPayload.error));
  }

  const data = parsedPayload.data;
  const schema = await describePostgresTable({
    connection: data.connection,
    schema: data.table.schema,
    table: data.table.name,
  });

  return successResponse({
    schema,
    suggestedMappings: buildSuggestedMappings({
      headers: [],
      schema,
    }),
  });
});
