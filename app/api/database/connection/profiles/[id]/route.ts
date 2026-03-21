import { successResponse, withApiHandler } from "@/api/_lib/api-response";
import { AuthenticationError, NotFoundError, ValidationError } from "@/core/errors/error-classes";
import { updateConnectionProfileSyncMode } from "@/core/persistence/connection-profiles-repo";
import { getZodErrorMessage } from "@/zodSchemas/api";
import { updateConnectionProfileRequestSchema } from "@/zodSchemas/database";

export const PATCH = withApiHandler(
  async (request: Request, context: { params: { id: string } }) => {
    const auth = await requireAppUser();

    if ("response" in auth) {
      throw new AuthenticationError("Authentication required");
    }

    const body = await request.json();
    const parsedPayload = updateConnectionProfileRequestSchema.safeParse(body);

    if (!parsedPayload.success) {
      throw new ValidationError(getZodErrorMessage(parsedPayload.error));
    }

    const connectionProfile = await updateConnectionProfileSyncMode({
      profileId: context.params.id,
      userId: auth.userId,
      syncMode: parsedPayload.data.syncMode,
    });

    if (!connectionProfile) {
      throw new NotFoundError("Connection profile");
    }

    return successResponse({
      connectionProfile,
    });
  }
);
