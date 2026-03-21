"use client";

import { requestApi } from "@/frontendApi/client";
import type { BulkSendRequest, BulkSendResponseData } from "@/types/api";

export function sendBulk(payload: BulkSendRequest) {
  return requestApi<BulkSendResponseData>({
    method: "POST",
    url: "/api/send/bulk",
    data: payload,
  });
}
