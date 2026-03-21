"use client";

import { useMemo } from "react";

import { useCampaignStore } from "@/store/campaign-store";
import {
  selectRecipientOrder,
  selectRecipientsById,
  selectUi,
} from "@/store/selectors";

export function useRecipientPagination() {
  const order = useCampaignStore(selectRecipientOrder);
  const recipientsById = useCampaignStore(selectRecipientsById);
  const ui = useCampaignStore(selectUi);
  const setCurrentPage = useCampaignStore((state) => state.setCurrentPage);
  const setPageSize = useCampaignStore((state) => state.setPageSize);
  const setRecipientStatusView = useCampaignStore(
    (state) => state.setRecipientStatusView,
  );

  const filteredOrder = useMemo(
    () =>
      order.filter((id) => {
        const recipient = recipientsById[id];

        if (!recipient) {
          return false;
        }

        return ui.recipientStatusView === "sent" ? recipient.sent : !recipient.sent;
      }),
    [order, recipientsById, ui.recipientStatusView],
  );

  const sentCount = useMemo(
    () => order.filter((id) => recipientsById[id]?.sent).length,
    [order, recipientsById],
  );
  const unsentCount = order.length - sentCount;
  const totalPages = Math.max(1, Math.ceil(filteredOrder.length / ui.pageSize));
  const currentPage = Math.min(ui.currentPage, totalPages);

  const visibleIds = useMemo(() => {
    const startIndex = (currentPage - 1) * ui.pageSize;
    return filteredOrder.slice(startIndex, startIndex + ui.pageSize);
  }, [currentPage, filteredOrder, ui.pageSize]);

  return {
    currentPage,
    pageSize: ui.pageSize,
    recipientStatusView: ui.recipientStatusView,
    sentCount,
    totalPages,
    unsentCount,
    visibleIds,
    totalRecipients: filteredOrder.length,
    setCurrentPage,
    setPageSize,
    setRecipientStatusView,
  };
}
