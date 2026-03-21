import { successResponse } from "@/api/_lib/api-response";
import { withApiHandler } from "@/api/_lib/error-handler";
import { AuthenticationError, NotFoundError } from "@/core/errors/error-classes";
import { getCampaignHistoryById } from "@/core/persistence/campaign-history-repo";

export const GET = withApiHandler(async (
  _request: Request,
  context: { params: { id: string } }
) => {
  const auth = await requireAppUser();

  if ("response" in auth) {
    throw new AuthenticationError("Authentication required");
  }

  const campaign = await getCampaignHistoryById(auth.userId, context.params.id);

  if (!campaign) {
    throw new NotFoundError("Campaign");
  }

  return successResponse({
    campaign,
  });
});
