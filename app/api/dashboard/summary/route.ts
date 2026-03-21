import { successResponse } from "@/api/_lib/api-response";
import { withApiHandler } from "@/api/_lib/error-handler";
import { AuthenticationError } from "@/core/errors/error-classes";
import { getDashboardSummaryForUser } from "@/core/persistence/dashboard-summary";

export const GET = withApiHandler(async () => {
  const auth = await requireAppUser();

  if ("response" in auth) {
    throw new AuthenticationError("Authentication required");
  }

  const summary = await getDashboardSummaryForUser(auth.userId);

  return successResponse(summary);
});
