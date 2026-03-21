"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { saveCampaign } from "@/frontendApi";
import { queryKeys } from "@/tanStack/query-keys";
import type { SaveCampaignPayload } from "@/types/database";

export function useSaveCampaignMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SaveCampaignPayload) => saveCampaign(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.summary(),
      });
    },
  });
}
