"use client";

import { useMutation } from "@tanstack/react-query";

import { sendBulk } from "@/frontendApi";

export function useSendBulkMutation() {
  return useMutation({
    mutationFn: sendBulk,
  });
}
