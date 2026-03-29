"use client";

import { requestApi } from "@/frontendApi/client";
import type { BulkSendRequest, BulkSendResponseData, TestEmailRequest } from "@/types/api";

export function sendBulk(payload: BulkSendRequest) {
  return requestApi<BulkSendResponseData>({
    method: "POST",
    url: "/api/send/bulk",
    data: payload,
  });
}

export function sendTestEmail(payload: TestEmailRequest) {
  return requestApi<{ providerMessageId: string }>({
    method: "POST",
    url: "/api/send/test",
    data: payload,
  });
}
