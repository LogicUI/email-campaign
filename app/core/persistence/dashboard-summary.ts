import type { DashboardSummaryResponseData } from "@/types/database";
import { listCampaignHistoryForUser } from "@/core/persistence/campaign-history-repo";
import { listConnectionProfilesForUser } from "@/core/persistence/connection-profiles-repo";
import { listSavedListsForUser } from "@/core/persistence/saved-lists-repo";

/**
 * Aggregates the dashboard data needed immediately after login.
 *
 * The root page decides whether to open dashboard mode or upload mode based on this
 * summary, so we fetch saved lists, campaign history, and connection profiles in
 * parallel and return one compact payload to the UI.
 *
 * @param userId Stable app-owned user identifier.
 * @returns Dashboard summary used by the home shell and dashboard view.
 */
export async function getDashboardSummaryForUser(userId: string) {
  const [savedLists, campaigns, connectionProfiles] = await Promise.all([
    listSavedListsForUser(userId),
    listCampaignHistoryForUser(userId),
    listConnectionProfilesForUser(userId),
  ]);

  return {
    hasSavedData: savedLists.length > 0 || campaigns.length > 0,
    savedLists,
    campaigns,
    connectionProfiles,
  } satisfies DashboardSummaryResponseData;
}
