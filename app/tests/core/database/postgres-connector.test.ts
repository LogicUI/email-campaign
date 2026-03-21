import { afterEach, describe, expect, it, vi } from "vitest";

const executeMock = vi.fn();
const endMock = vi.fn().mockResolvedValue(undefined);
const poolConstructorMock = vi.fn(() => ({
  end: endMock,
}));

vi.mock("pg", () => ({
  Pool: poolConstructorMock,
}));

vi.mock("drizzle-orm/node-postgres", () => ({
  drizzle: vi.fn(() => ({
    execute: executeMock,
  })),
}));

vi.mock("drizzle-orm", () => {
  const sqlTag = Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => ({
      strings,
      values,
    }),
    {
      join: vi.fn(),
      raw: vi.fn(),
    },
  );

  return {
    sql: sqlTag,
  };
});

afterEach(() => {
  executeMock.mockReset();
  endMock.mockClear();
  poolConstructorMock.mockClear();
});

describe("postgres connector", () => {
  it("adds sslmode=require automatically for remote Postgres hosts", async () => {
    executeMock.mockResolvedValueOnce({
      rows: [
        {
          current_database: "postgres",
          current_schema: "public",
          current_user: "postgres",
        },
      ],
    });

    const { testPostgresConnection } = await import("@/core/database/postgres-connector");

    await testPostgresConnection({
      provider: "supabase",
      label: "Primary Supabase",
      connectionString: "postgresql://postgres:secret@db.example.com:5432/postgres",
      syncMode: "auto",
    });

    expect(poolConstructorMock).toHaveBeenCalledWith({
      connectionString: "postgresql://postgres:secret@db.example.com:5432/postgres?sslmode=require",
      max: 1,
    });
    expect(endMock).toHaveBeenCalledTimes(1);
  });

  it("configures verified TLS automatically for Supabase pooler hosts", async () => {
    executeMock.mockResolvedValueOnce({
      rows: [
        {
          current_database: "postgres",
          current_schema: "public",
          current_user: "postgres",
        },
      ],
    });

    const { testPostgresConnection } = await import("@/core/database/postgres-connector");

    await testPostgresConnection({
      provider: "supabase",
      label: "Primary Supabase",
      connectionString:
        "postgresql://postgres.uwnnubcobjxoowdkqohg:secret@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=verify-full",
      syncMode: "auto",
    });

    expect(poolConstructorMock).toHaveBeenCalledWith({
      connectionString:
        "postgresql://postgres.uwnnubcobjxoowdkqohg:secret@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres",
      max: 1,
      ssl: expect.objectContaining({
        rejectUnauthorized: true,
        servername: "aws-0-ap-southeast-1.pooler.supabase.com",
        ca: expect.stringContaining("BEGIN CERTIFICATE"),
      }),
    });
  });

  it("returns a Supabase-specific hint for unreachable direct hosts", async () => {
    const error = Object.assign(new Error("connect ENETUNREACH"), {
      code: "ENETUNREACH",
    });
    executeMock.mockRejectedValueOnce(error);

    const { testPostgresConnection } = await import("@/core/database/postgres-connector");

    await expect(
      testPostgresConnection({
        provider: "supabase",
        label: "Primary Supabase",
        connectionString:
          "postgresql://postgres:secret@db.uwnnubcobjxoowdkqohg.supabase.co:5432/postgres",
        syncMode: "auto",
      }),
    ).rejects.toThrow(/Session pooler connection string/);
    expect(endMock).toHaveBeenCalledTimes(1);
  });

  it("unwraps Drizzle query errors to expose the underlying driver message", async () => {
    const wrappedError = new Error(
      "Failed query: select current_database(), current_schema(), current_user\nparams: ",
    );
    wrappedError.cause = Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:5432"), {
      code: "ECONNREFUSED",
    });
    executeMock.mockRejectedValueOnce(wrappedError);

    const { testPostgresConnection } = await import("@/core/database/postgres-connector");

    await expect(
      testPostgresConnection({
        provider: "postgres",
        label: "Local Postgres",
        connectionString: "postgresql://postgres:secret@127.0.0.1:5432/postgres",
        syncMode: "auto",
      }),
    ).rejects.toThrow(/ECONNREFUSED 127\.0\.0\.1:5432/);
  });

  it("derives the Supabase project ref from a pooler username", async () => {
    const { normalizeConnectionProfile } = await import("@/core/database/postgres-connector");

    expect(
      normalizeConnectionProfile({
        provider: "supabase",
        label: "Primary Supabase",
        connectionString:
          "postgresql://postgres.uwnnubcobjxoowdkqohg:secret@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres",
        syncMode: "auto",
      }),
    ).toMatchObject({
      displayHost: "aws-0-ap-southeast-1.pooler.supabase.com",
      displayDatabaseName: "postgres",
      displayProjectRef: "uwnnubcobjxoowdkqohg",
    });
  });

  it("inserts only valid rows into external tables", async () => {
    executeMock.mockResolvedValueOnce({
      rows: [],
    });

    const { insertRowsIntoPostgresTable } = await import("@/core/database/postgres-connector");

    await expect(
      insertRowsIntoPostgresTable({
        connection: {
          provider: "postgres",
          label: "Local Postgres",
          connectionString: "postgresql://postgres:secret@127.0.0.1:5432/postgres",
          syncMode: "auto",
        },
        schema: "public",
        table: "leads",
        mappings: [
          {
            sourceColumn: "email",
            destinationColumn: "email",
          },
        ],
        preview: {
          fileName: "leads.csv",
          sourceFiles: [
            {
              fileName: "leads.csv",
            },
          ],
          sourceRows: [],
          headers: ["email"],
          rows: [
            {
              tempId: "row_1",
              rowIndex: 2,
              email: "north@example.com",
              sourceFileName: "leads.csv",
              isValid: true,
              fields: {},
              raw: {
                email: "north@example.com",
              },
            },
            {
              tempId: "row_2",
              rowIndex: 3,
              email: "bad-email",
              sourceFileName: "leads.csv",
              isValid: false,
              invalidReason: "Invalid email format.",
              fields: {},
              raw: {
                email: "bad-email",
              },
            },
          ],
          validCount: 1,
          invalidCount: 1,
          candidateEmailColumns: ["email"],
          candidateRecipientColumns: [],
        },
      }),
    ).resolves.toEqual({
      insertedCount: 1,
    });
    expect(executeMock).toHaveBeenCalledTimes(1);
  });
});
