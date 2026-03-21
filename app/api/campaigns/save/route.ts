import { successResponse, withApiHandler } from "@/api/_lib/api-response";
import { AuthenticationError, ValidationError } from "@/core/errors/error-classes";
import { markConnectionProfileSynced } from "@/core/persistence/connection-profiles-repo";
import { saveCampaignRun } from "@/core/persistence/campaign-history-repo";
import { getZodErrorMessage } from "@/zodSchemas/api";
import { saveCampaignHistoryRequestSchema } from "@/zodSchemas/database";

export const POST = withApiHandler(async (request: Request) => {
  const auth = await requireAppUser();

  if ("response" in auth) {
    throw new AuthenticationError("Authentication required");
  }

  const body = await request.json();
  const parsedPayload = saveCampaignHistoryRequestSchema.safeParse(body);

  if (!parsedPayload.success) {
    throw new ValidationError(getZodErrorMessage(parsedPayload.error));
  }

  const data = parsedPayload.data;
  const syncedAt = data.sentAt ?? new Date().toISOString();
  const campaign = await saveCampaignRun({
    userId: auth.userId,
    campaign: {
      ...data.campaign,
      sourceType: data.campaign.sourceType ?? data.sourceType,
    },
    recipients: data.recipients,
    sourceType: data.sourceType,
    savedListId: data.savedListId,
    sentAt: syncedAt,
  });
  const connectionProfile = data.profileId
    ? await markConnectionProfileSynced({
        profileId: data.profileId,
        userId: auth.userId,
        syncedAt,
      })
    : null;

  return successResponse({
    campaign,
    connectionProfile,
    syncedAt,
  });
});
