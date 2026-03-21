import { describe, expect, it, vi } from "vitest";

import { POST } from "@/api/database/connection/test/route";

vi.mock("@/api/_lib/app-user", () => ({
  requireAppUser: vi.fn(),
}));

vi.mock("@/core/database/postgres-connector", () => ({
  testPostgresConnection: vi.fn(),
}));

vi.mock("@/core/persistence/connection-profiles-repo", () => ({
  upsertConnectionProfile: vi.fn(),
}));

const { requireAppUser } = await import("@/api/_lib/app-user");
const { testPostgresConnection } = await import("@/core/database/postgres-connector");
const { upsertConnectionProfile } = await import("@/core/persistence/connection-profiles-repo");

describe("POST /api/database/connection/test", () => {
  it("returns unauthorized when the app user is missing", async () => {
    vi.mocked(requireAppUser).mockResolvedValueOnce({
      response: Response.json(
        {
          ok: false,
          error: "auth",
        },
        { status: 401 },
      ),
    });

    const response = await POST(
      new Request("http://localhost/api/database/connection/test", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("validates reachability without persisting profiles or loading tables", async () => {
    vi.mocked(requireAppUser).mockResolvedValueOnce({
      session: {
        user: {
          email: "owner@example.com",
        },
      },
      userId: "user_1",
    } as never);
    vi.mocked(testPostgresConnection).mockResolvedValueOnce({
      current_database: "postgres",
      current_schema: "public",
      current_user: "postgres",
    });

    const response = await POST(
      new Request("http://localhost/api/database/connection/test", {
        method: "POST",
        body: JSON.stringify({
          connection: {
            provider: "supabase",
            label: "Primary Supabase",
            connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
            syncMode: "auto",
          },
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        reachable: true,
      },
    });
    expect(testPostgresConnection).toHaveBeenCalledTimes(1);
    expect(upsertConnectionProfile).not.toHaveBeenCalled();
  });

  it("returns a validation error for malformed requests", async () => {
    vi.mocked(requireAppUser).mockResolvedValueOnce({
      session: {
        user: {
          email: "owner@example.com",
        },
      },
      userId: "user_1",
    } as never);

    const response = await POST(
      new Request("http://localhost/api/database/connection/test", {
        method: "POST",
        body: JSON.stringify({
          connection: {
            provider: "supabase",
            label: "",
            connectionString: "",
          },
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(testPostgresConnection).not.toHaveBeenCalled();
    expect(upsertConnectionProfile).not.toHaveBeenCalled();
  });
});
