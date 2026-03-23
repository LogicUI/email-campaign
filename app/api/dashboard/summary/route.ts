import { successResponse } from "@/api/_lib/api-response";
import { requireAppUser } from "@/api/_lib/app-user";
import { withApiHandler } from "@/api/_lib/error-handler";
import { getDashboardSummaryForUser } from "@/core/persistence/dashboard-summary";

export const GET = withApiHandler(async () => {
  const auth = await requireAppUser();

  if ("response" in auth) {
    return auth.response;
  }

  const summary = await getDashboardSummaryForUser(auth.userId);

  return successResponse(summary);
});
