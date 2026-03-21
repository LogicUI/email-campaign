import { vi } from "vitest";

export const mockRouter = {
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn().mockResolvedValue(undefined),
  push: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
};

export const mockRedirect = vi.fn();
export const mockNotFound = vi.fn();

let mockPathname = "/";
let mockSearchParams = new URLSearchParams();

export function resetMockRouter() {
  mockRouter.back.mockReset();
  mockRouter.forward.mockReset();
  mockRouter.prefetch.mockReset();
  mockRouter.prefetch.mockResolvedValue(undefined);
  mockRouter.push.mockReset();
  mockRouter.refresh.mockReset();
  mockRouter.replace.mockReset();
  mockRedirect.mockReset();
  mockNotFound.mockReset();
  mockPathname = "/";
  mockSearchParams = new URLSearchParams();
}

function setMockPathname(pathname: string) {
  mockPathname = pathname;
}

function setMockSearchParams(
  params?: string | URLSearchParams | Record<string, string>,
) {
  if (!params) {
    mockSearchParams = new URLSearchParams();
    return;
  }

  if (typeof params === "string" || params instanceof URLSearchParams) {
    mockSearchParams = new URLSearchParams(params);
    return;
  }

  mockSearchParams = new URLSearchParams(params);
}

export function getMockPathname() {
  return mockPathname;
}

export function getMockSearchParams() {
  return new URLSearchParams(mockSearchParams);
}
