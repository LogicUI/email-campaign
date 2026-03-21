import { describe, expect, it, vi } from "vitest";

const signOutMock = vi.fn();

vi.mock("next-auth/react", () => ({
  signOut: signOutMock,
}));

describe("performClientSignOut", () => {
  it("navigates to the returned local callback url and refreshes the router", async () => {
    signOutMock.mockResolvedValue({
      url: "http://localhost:3001/login?callbackUrl=%2F",
    });

    const replace = vi.fn();
    const refresh = vi.fn();

    vi.stubGlobal("window", {
      location: {
        origin: "http://localhost:3001",
      },
    });

    const { performClientSignOut } = await import("@/core/auth/client-sign-out");

    await performClientSignOut({
      navigator: {
        replace,
        refresh,
      },
    });

    expect(signOutMock).toHaveBeenCalledWith({
      redirect: false,
      callbackUrl: "/login",
    });
    expect(replace).toHaveBeenCalledWith("/login?callbackUrl=%2F");
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("falls back to /login when next-auth returns an external url", async () => {
    signOutMock.mockResolvedValue({
      url: "https://malicious.example/logout",
    });

    const replace = vi.fn();
    const refresh = vi.fn();

    vi.stubGlobal("window", {
      location: {
        origin: "http://localhost:3001",
      },
    });

    const { performClientSignOut } = await import("@/core/auth/client-sign-out");

    await performClientSignOut({
      navigator: {
        replace,
        refresh,
      },
    });

    expect(replace).toHaveBeenCalledWith("/login");
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
