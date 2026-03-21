"use client";

import { requestApi } from "@/frontendApi/client";
import type {
  CampaignHistoryDetail,
  DashboardSummaryResponseData,
  SavedListDetail,
} from "@/types/database";

export function getDashboardSummary() {
  return requestApi<DashboardSummaryResponseData>({
    method: "GET",
    url: "/api/dashboard/summary",
  });
}

export async function getSavedList(savedListId: string) {
  const data = await requestApi<{ savedList: SavedListDetail }>({
    method: "GET",
    url: `/api/lists/${savedListId}`,
  });

  return data.savedList;
}

export async function getCampaignHistory(campaignId: string) {
  const data = await requestApi<{ campaign: CampaignHistoryDetail }>({
    method: "GET",
    url: `/api/campaigns/${campaignId}`,
  });

  return data.campaign;
}
