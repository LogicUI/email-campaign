import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, vi } from "vitest";

import { initialAiSettingsState, useAiSettingsStore } from "@/store/ai-settings-store";
import { useCampaignStore } from "@/store/campaign-store";

const initialStoreState = useCampaignStore.getState();

beforeAll(() => {
  process.env.AUTH_SECRET = "test-auth-secret";
  process.env.AUTH_GOOGLE_ID = "google-client-id";
  process.env.AUTH_GOOGLE_SECRET = "google-client-secret";
  process.env.NEXTAUTH_URL = "http://localhost:3001";

  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  class PointerEventMock extends MouseEvent {}

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  Object.defineProperty(window, "ResizeObserver", {
    writable: true,
    value: ResizeObserverMock,
  });

  Object.defineProperty(window, "PointerEvent", {
    writable: true,
    value: PointerEventMock,
  });

  HTMLElement.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
  localStorage.clear();
  useAiSettingsStore.setState(initialAiSettingsState);
  useCampaignStore.setState(initialStoreState, true);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

afterEach(() => {
  cleanup();
});
