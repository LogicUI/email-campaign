"use client";

import { useCallback, useMemo } from "react";

import { buildCampaignFromHistory, buildImportPreviewFromSavedList } from "@/core/campaign/restore-from-history";
import { useCampaignStore } from "@/store/campaign-store";
import {
  useCampaignHistoryMutation,
  useDashboardSummaryQuery,
  useSavedListMutation,
} from "@/tanStack/dashboard";
import type {
  DashboardSummaryResponseData,
} from "@/types/database";

export function useDashboardData(params: {
  initialSummary: DashboardSummaryResponseData;
  onOpenWorkspace: () => void;
}) {
  const { initialSummary, onOpenWorkspace } = params;
  const hydrateImportPreview = useCampaignStore((state) => state.hydrateImportPreview);
  const restoreCampaignFromHistory = useCampaignStore((state) => state.restoreCampaignFromHistory);
  const summaryQuery = useDashboardSummaryQuery(initialSummary);
  const savedListMutation = useSavedListMutation();
  const campaignHistoryMutation = useCampaignHistoryMutation();

  const refresh = useCallback(async () => {
    const result = await summaryQuery.refetch();

    if (result.error) {
      throw result.error;
    }

    return result.data;
  }, [summaryQuery]);

  const openSavedList = useCallback((savedListId: string) => {
    savedListMutation.mutate(savedListId, {
      onSuccess: (savedList) => {
        hydrateImportPreview(buildImportPreviewFromSavedList(savedList));
        onOpenWorkspace();
      },
    });
  }, [hydrateImportPreview, onOpenWorkspace, savedListMutation]);

  const reuseCampaign = useCallback((campaignId: string) => {
    campaignHistoryMutation.mutate(campaignId, {
      onSuccess: (campaign) => {
        restoreCampaignFromHistory(buildCampaignFromHistory(campaign));
        onOpenWorkspace();
      },
    });
  }, [campaignHistoryMutation, onOpenWorkspace, restoreCampaignFromHistory]);

  const error = useMemo(() => {
    const activeError =
      summaryQuery.error ?? savedListMutation.error ?? campaignHistoryMutation.error ?? null;

    return activeError instanceof Error ? activeError.message : null;
  }, [campaignHistoryMutation.error, savedListMutation.error, summaryQuery.error]);

  const isLoading =
    summaryQuery.isFetching || savedListMutation.isPending || campaignHistoryMutation.isPending;

  return {
    error,
    isLoading,
    openSavedList,
    refresh,
    reuseCampaign,
    summary: summaryQuery.data ?? initialSummary,
  };
}
