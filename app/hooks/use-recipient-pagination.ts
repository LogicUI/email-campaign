"use client";

import { useMemo } from "react";

import { useCampaignStore } from "@/store/campaign-store";
import { selectRecipientOrder, selectUi } from "@/store/selectors";

export function useRecipientPagination() {
  const order = useCampaignStore(selectRecipientOrder);
  const ui = useCampaignStore(selectUi);
  const setCurrentPage = useCampaignStore((state) => state.setCurrentPage);
  const setPageSize = useCampaignStore((state) => state.setPageSize);

  const totalPages = Math.max(1, Math.ceil(order.length / ui.pageSize));
  const currentPage = Math.min(ui.currentPage, totalPages);

  const visibleIds = useMemo(() => {
    const startIndex = (currentPage - 1) * ui.pageSize;
    return order.slice(startIndex, startIndex + ui.pageSize);
  }, [currentPage, order, ui.pageSize]);

  return {
    currentPage,
    pageSize: ui.pageSize,
    totalPages,
    visibleIds,
    totalRecipients: order.length,
    setCurrentPage,
    setPageSize,
  };
}
