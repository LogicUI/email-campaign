import { successResponse } from "@/api/_lib/api-response";
import { requireAppUser } from "@/api/_lib/app-user";
import { withApiHandler } from "@/api/_lib/error-handler";
import { listCampaignHistoryForUser } from "@/core/persistence/campaign-history-repo";

export const GET = withApiHandler(async () => {
  const auth = await requireAppUser();

  if ("response" in auth) {
    return auth.response;
  }

  const campaigns = await listCampaignHistoryForUser(auth.userId);

  return successResponse({
    campaigns,
  });
});
