"use client";

import axios, { type AxiosRequestConfig } from "axios";

export interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export const frontendApiClient = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
});

frontendApiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const responseError = error.response?.data as { error?: unknown } | undefined;
      const message =
        typeof responseError?.error === "string"
          ? responseError.error
          : error.message || "Request failed.";

      return Promise.reject(new Error(message));
    }

    return Promise.reject(error instanceof Error ? error : new Error("Request failed."));
  },
);

export async function requestApi<T>(config: AxiosRequestConfig) {
  const response = await frontendApiClient.request<ApiEnvelope<T>>(config);

  if (!response.data.ok || typeof response.data.data === "undefined") {
    throw new Error(response.data.error ?? "Request failed.");
  }

  return response.data.data;
}
