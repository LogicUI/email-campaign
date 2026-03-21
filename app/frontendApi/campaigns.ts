"use client";

import { requestApi } from "@/frontendApi/client";
import type { SaveCampaignPayload, SaveCampaignResponseData } from "@/types/database";

export function saveCampaign(payload: SaveCampaignPayload) {
  return requestApi<SaveCampaignResponseData>({
    method: "POST",
    url: "/api/campaigns/save",
    data: payload,
  });
}
