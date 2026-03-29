"use client";

import { useMutation } from "@tanstack/react-query";

import { sendBulk, sendTestEmail } from "@/frontendApi";

export function useSendBulkMutation() {
  return useMutation({
    mutationFn: sendBulk,
  });
}

export function useSendTestEmailMutation() {
  return useMutation({
    mutationFn: sendTestEmail,
  });
}
