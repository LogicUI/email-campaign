import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";

import { setAppDatabaseForTests } from "@/core/persistence/app-db";
import { initialAiSettingsState, useAiSettingsStore } from "@/store/ai-settings-store";
import { useCampaignStore } from "@/store/campaign-store";
import {
  cleanupTestDatabase,
  getAppTestDatabase,
  initializeTestDatabase,
  resetTestDatabase,
} from "@/tests/setup/test-database";
import {
  getMockPathname,
  getMockSearchParams,
  mockNotFound,
  mockRedirect,
  mockRouter,
  resetMockRouter,
} from "@/tests/utils/mock-next-navigation";

vi.mock("next/navigation", () => ({
  notFound: mockNotFound,
  redirect: mockRedirect,
  usePathname: () => getMockPathname(),
  useRouter: () => mockRouter,
  useSearchParams: () => getMockSearchParams(),
}));

const initialStoreState = useCampaignStore.getState();

beforeAll(async () => {
  await initializeTestDatabase();
  setAppDatabaseForTests(getAppTestDatabase());

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

  // Mock DOMRect methods for ProseMirror/TipTap in tests
  const emptyRect = {
    bottom: 0,
    height: 0,
    left: 0,
    right: 0,
    top: 0,
    width: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  };

  // Create a proper DOMRectList mock
  const createDOMRectList = (rects: typeof emptyRect[]) => ({
    ...rects,
    length: rects.length,
    item: (index: number) => rects[index] || null,
  });

  Element.prototype.getClientRects = vi.fn(() => createDOMRectList([]));
  Element.prototype.getBoundingClientRect = vi.fn(() => emptyRect);
  Range.prototype.getClientRects = vi.fn(() => createDOMRectList([]));
  Range.prototype.getBoundingClientRect = vi.fn(() => emptyRect);

  // Mock elementFromPoint for ProseMirror/TipTap in tests
  document.elementFromPoint = vi.fn(() => null);
});

beforeEach(() => {
  resetTestDatabase();
  localStorage.clear();
  useAiSettingsStore.setState(initialAiSettingsState);
  useCampaignStore.setState(initialStoreState, true);
  vi.restoreAllMocks();
  resetMockRouter();
  vi.unstubAllGlobals();
});

afterEach(() => {
  cleanup();
});

afterAll(async () => {
  setAppDatabaseForTests(undefined);
  await cleanupTestDatabase();
});
