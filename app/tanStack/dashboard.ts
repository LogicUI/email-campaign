"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import { getCampaignHistory, getDashboardSummary, getSavedList } from "@/frontendApi";
import { queryKeys } from "@/tanStack/query-keys";
import type { DashboardSummaryResponseData } from "@/types/database";

export function useDashboardSummaryQuery(initialSummary?: DashboardSummaryResponseData) {
  return useQuery({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: getDashboardSummary,
    initialData: initialSummary,
  });
}

export function useSavedListMutation() {
  return useMutation({
    mutationFn: getSavedList,
  });
}

export function useCampaignHistoryMutation() {
  return useMutation({
    mutationFn: getCampaignHistory,
  });
}
