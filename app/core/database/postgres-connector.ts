import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool, type PoolConfig } from "pg";

import { inferDatabaseColumns } from "@/core/database/infer-column-types";
import type { ImportPreview } from "@/types/campaign";
import type {
  DatabaseImportColumnMapping,
  DatabaseSessionConnection,
  DatabaseTableRef,
  DatabaseTableSchema,
  InferredDatabaseColumn,
} from "@/types/database";

/**
 * Quotes a SQL identifier defensively before embedding it into dynamic DDL/DML.
 *
 * This exists because table and column names in this connector are partly derived
 * from user input or discovered schema metadata. Values are parameterized elsewhere,
 * but identifiers cannot be bound as parameters, so they must be escaped explicitly.
 *
 * @param value Schema, table, or column identifier to quote.
 * @returns A Postgres-safe quoted identifier string.
 */
function quoteIdentifier(value: string) {
  return `"${value.replace(/"/g, "\"\"")}"`;
}

/**
 * Normalizes free-form labels into predictable snake_case identifiers.
 *
 * We use this when suggesting table names, matching source headers against
 * destination columns, and cleaning user-provided table names. The function keeps
 * naming stable while avoiding invalid identifiers that start with digits.
 *
 * @param value Raw label or identifier candidate.
 * @returns A normalized identifier suitable for Postgres object names.
 */
function normalizeIdentifier(value: string) {
  const snake = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!snake) {
    return "column_value";
  }

  return /^[0-9]/.test(snake) ? `col_${snake}` : snake;
}

/**
 * Validates that a connection string is parseable and Postgres-compatible.
 *
 * This exists to fail early before trying to build a driver connection. The UI
 * supports Supabase as a first-class option, but it still resolves to a standard
 * Postgres connection under the hood.
 *
 * @param connectionString Raw browser-session database connection string.
 * @returns Parsed URL instance for downstream metadata extraction.
 * @throws Error when the string is malformed or not a postgres/postgresql URL.
 */
function normalizeConnectionString(connectionString: string) {
  let parsed: URL;

  try {
    parsed = new URL(connectionString);
  } catch {
    throw new Error("Connection string is invalid.");
  }

  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error("Only postgres-style connection strings are supported.");
  }

  return parsed;
}

function isLocalPostgresHost(hostname: string) {
  return ["localhost", "127.0.0.1", "::1"].includes(hostname);
}

function isSupabaseDirectHost(hostname: string) {
  return hostname.startsWith("db.") && hostname.endsWith(".supabase.co");
}

function isSupabasePoolerHost(hostname: string) {
  return hostname.endsWith(".pooler.supabase.com");
}

const SUPABASE_CA_BUNDLE = `-----BEGIN CERTIFICATE-----
MIIDvzCCAqegAwIBAgIUBhalAwMQ7BA1NH7td4msPPwxHzowDQYJKoZIhvcNAQEL
BQAwazELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB0RlbHdhcmUxEzARBgNVBAcMCk5l
dyBDYXN0bGUxFTATBgNVBAoMDFN1cGFiYXNlIEluYzEeMBwGA1UEAwwVU3VwYWJh
c2UgUm9vdCAyMDIxIENBMB4XDTIzMTAyNDA3NTM0NVoXDTMzMTAyMTA3NTM0NVow
czELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB0RlbHdhcmUxEzARBgNVBAcMCk5ldyBD
YXN0bGUxFTATBgNVBAoMDFN1cGFiYXNlIEluYzEmMCQGA1UEAwwdU3VwYWJhc2Ug
SW50ZXJtZWRpYXRlIDIwMjEgQ0EwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEK
AoIBAQDOAMhXirH+EGIn8GaDp8T53rEogf7kM8OKW2uQ5yU/wxPa+w8BXgTzWy3W
JDAUhZE78oUtAd9kk5zKPrLXoT3W61PPnOc/9dceL5gB7/78m7EKCySziAA2c8vR
fnYPfznedDXi2lryttSYmMf2qbZDErAxwJDUm6cyq+HLAfb2qUH28u6jP8I9GDtG
PkQnjqtiRXEKjbTc/ntqCQrhtFK02mHkMSju7nEpkNYryunv5n/c9mrRY9/8GwmP
3uSZz3CQ8yQ/E0f8T9gCca2TcKuTQmW2pQqtHv1MuZ3jfJE5Nr9+Fap5kdzDJtdf
BdKofVNZlnYIru5yhUZywY3xYFfHAgMBAAGjUzBRMB0GA1UdDgQWBBQVoFMuvXJ9
Yv+QJr6/GJX0Z0VA+jAfBgNVHSMEGDAWgBSo17l2N9gs7ZISJp4OMiTVLWlGLDAP
BgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3DQEBCwUAA4IBAQAwdx0XJRHTf/crGpsr
n07uRziGSswWWTe+kDATMQeRZAEW3grVki5LDzs+JLbVIJYhRXFRXkqTRJdSGAgH
/0LNw7GDUwKOLnIRoYR3ILqSFZbkXbrYQ4Yir5yQZWgiNhRNfpEnMMIEQEZoSuFn
8Uh6M4HNfVuwBPgV0/gvKEja3DjJgwPAYzoXvKh5m3fKTt2c22YcTDdZTUDfrst6
Vpt/M03FY6D+897yfNR+nEzeEwjzHMZkperTwVfmBdyXIgIWexQ/whoky7+I4pjz
eLtkPBlwE3WB9fGZVjZqdUNSasS8mmWIyxHPttTzTHHmElDw2OQ/s9HjfCxJztk2
VCgJ
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
MIIDxDCCAqygAwIBAgIUbLxMod62P2ktCiAkxnKJwtE9VPYwDQYJKoZIhvcNAQEL
BQAwazELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB0RlbHdhcmUxEzARBgNVBAcMCk5l
dyBDYXN0bGUxFTATBgNVBAoMDFN1cGFiYXNlIEluYzEeMBwGA1UEAwwVU3VwYWJh
c2UgUm9vdCAyMDIxIENBMB4XDTIxMDQyODEwNTY1M1oXDTMxMDQyNjEwNTY1M1ow
azELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB0RlbHdhcmUxEzARBgNVBAcMCk5ldyBD
YXN0bGUxFTATBgNVBAoMDFN1cGFiYXNlIEluYzEeMBwGA1UEAwwVU3VwYWJhc2Ug
Um9vdCAyMDIxIENBMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqQXW
QyHOB+qR2GJobCq/CBmQ40G0oDmCC3mzVnn8sv4XNeWtE5XcEL0uVih7Jo4Dkx1Q
DmGHBH1zDfgs2qXiLb6xpw/CKQPypZW1JssOTMIfQppNQ87K75Ya0p25Y3ePS2t2
GtvHxNjUV6kjOZjEn2yWEcBdpOVCUYBVFBNMB4YBHkNRDa/+S4uywAoaTWnCJLUi
cvTlHmMw6xSQQn1UfRQHk50DMCEJ7Cy1RxrZJrkXXRP3LqQL2ijJ6F4yMfh+Gyb4
O4XajoVj/+R4GwywKYrrS8PrSNtwxr5StlQO8zIQUSMiq26wM8mgELFlS/32Uclt
NaQ1xBRizkzpZct9DwIDAQABo2AwXjALBgNVHQ8EBAMCAQYwHQYDVR0OBBYEFKjX
uXY32CztkhImng4yJNUtaUYsMB8GA1UdIwQYMBaAFKjXuXY32CztkhImng4yJNUt
aUYsMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEBAB8spzNn+4VU
tVxbdMaX+39Z50sc7uATmus16jmmHjhIHz+l/9GlJ5KqAMOx26mPZgfzG7oneL2b
VW+WgYUkTT3XEPFWnTp2RJwQao8/tYPXWEJDc0WVQHrpmnWOFKU/d3MqBgBm5y+6
jB81TU/RG2rVerPDWP+1MMcNNy0491CTL5XQZ7JfDJJ9CCmXSdtTl4uUQnSuv/Qx
Cea13BX2ZgJc7Au30vihLhub52De4P/4gonKsNHYdbWjg7OWKwNv/zitGDVDB9Y2
CMTyZKG3XEu5Ghl1LEnI3QmEKsqaCLv12BnVjbkSeZsMnevJPs1Ye6TjjJwdik5P
o/bKiIz+Fq8=
-----END CERTIFICATE-----`;

function getSupabaseProjectRef(parsed: URL) {
  const host = parsed.hostname;
  const username = decodeURIComponent(parsed.username);

  if (isSupabaseDirectHost(host)) {
    return host.replace(/^db\./, "").split(".")[0];
  }

  if (isSupabasePoolerHost(host) && username.startsWith("postgres.")) {
    return username.slice("postgres.".length) || undefined;
  }

  return undefined;
}

function buildDriverConnectionString(connectionString: string) {
  const parsed = normalizeConnectionString(connectionString);

  if (isSupabaseDirectHost(parsed.hostname) || isSupabasePoolerHost(parsed.hostname)) {
    parsed.searchParams.delete("sslmode");
    return parsed.toString();
  }

  if (!isLocalPostgresHost(parsed.hostname) && !parsed.searchParams.has("sslmode")) {
    parsed.searchParams.set("sslmode", "require");
  }

  return parsed.toString();
}

function buildPoolConfig(connectionString: string): PoolConfig {
  const parsed = normalizeConnectionString(connectionString);

  const poolConfig: PoolConfig = {
    connectionString: buildDriverConnectionString(connectionString),
    max: 1,
  };

  if (isSupabaseDirectHost(parsed.hostname) || isSupabasePoolerHost(parsed.hostname)) {
    poolConfig.ssl = {
      ca: SUPABASE_CA_BUNDLE,
      rejectUnauthorized: true,
      servername: parsed.hostname,
    };
  }

  return poolConfig;
}

function normalizeExternalDbError(error: unknown, connectionString: string) {
  const rootError =
    error instanceof Error &&
    "cause" in error &&
    error.cause instanceof Error
      ? error.cause
      : error;

  if (!(rootError instanceof Error)) {
    return new Error("Unable to connect to the database.");
  }

  const parsed = normalizeConnectionString(connectionString);
  const host = parsed.hostname;
  const username = decodeURIComponent(parsed.username);
  const errorCode =
    "code" in rootError && typeof rootError.code === "string" ? rootError.code : undefined;
  const message = rootError.message.toLowerCase();

  if (
    isSupabaseDirectHost(host) &&
    ["ENETUNREACH", "EHOSTUNREACH", "ENOTFOUND", "EAI_AGAIN", "ETIMEDOUT"].includes(
      errorCode ?? "",
    )
  ) {
    return new Error(
      "Supabase direct database hosts use IPv6 by default. This runtime likely cannot reach that address. Use the Session pooler connection string from Supabase Connect (`*.pooler.supabase.com:5432`) or make sure IPv6 is available.",
    );
  }

  if (
    isSupabasePoolerHost(host) &&
    username === "postgres"
  ) {
    return new Error(
      "This looks like a Supabase pooler host, but the username is missing the project ref. Use the exact Session pooler string from Supabase Connect, where the username looks like `postgres.<project-ref>`.",
    );
  }

  if (
    message.includes("no pg_hba.conf entry") ||
    message.includes("ssl off") ||
    message.includes("must use ssl")
  ) {
    return new Error(
      "This database requires SSL. The app now requests SSL automatically for remote hosts, but if you are pasting a custom DSN, make sure it includes `?sslmode=require`.",
    );
  }

  return rootError;
}

/**
 * Opens a short-lived external Postgres connection for one connector operation.
 *
 * This wrapper exists so external credentials remain session-scoped and ephemeral.
 * Each request gets its own tiny pool, performs one unit of work through Drizzle,
 * and closes immediately so we do not retain user-supplied credentials server-side.
 *
 * @param connectionString Postgres-compatible DSN supplied by the active browser session.
 * @param callback Async operation that receives a Drizzle database instance.
 * @returns The callback result once the operation completes.
 */
async function withExternalDb<T>(
  connectionString: string,
  callback: (db: ReturnType<typeof drizzle>) => Promise<T>,
) {
  const pool = new Pool(buildPoolConfig(connectionString));

  try {
    const db = drizzle(pool, {
      casing: "snake_case",
    });

    return await callback(db);
  } catch (error) {
    throw normalizeExternalDbError(error, connectionString);
  } finally {
    await pool.end();
  }
}

/**
 * Derives non-secret display metadata from the active external DB connection.
 *
 * This exists because the app persists connection profile metadata for the user,
 * but never stores the raw connection string. The returned values are safe to show
 * in the UI and save in the app-owned database.
 *
 * @param connection Active browser-session connection configuration.
 * @returns Safe profile metadata such as display host, database name, and label.
 */
export function normalizeConnectionProfile(connection: DatabaseSessionConnection) {
  const parsed = normalizeConnectionString(connection.connectionString);
  const host = parsed.hostname;
  const databaseName = parsed.pathname.replace(/^\//, "") || "postgres";
  const projectRef = getSupabaseProjectRef(parsed);

  return {
    label: connection.label.trim() || `${connection.provider} connection`,
    displayHost: host,
    displayDatabaseName: databaseName,
    displayProjectRef: projectRef,
  };
}

/**
 * Confirms that the provided Postgres/Supabase connection is reachable.
 *
 * The function performs a lightweight identity query so the settings flow can
 * distinguish between malformed credentials, permission problems, and a working
 * database before attempting table discovery or writes.
 *
 * @param connection Active browser-session connection configuration.
 * @returns Basic connection identity fields from Postgres.
 */
export async function testPostgresConnection(connection: DatabaseSessionConnection) {
  return withExternalDb(connection.connectionString, async (db) => {
    const result = (await db.execute(sql`
      select current_database(), current_schema(), current_user
    `)) as { rows: Array<{ current_database: string; current_schema: string; current_user: string }> };

    return result.rows[0];
  });
}

/**
 * Lists user-accessible base tables in the target external database.
 *
 * This exists to power the "choose existing table" step in the import flow.
 * System schemas are excluded because they are not valid destinations for app data.
 *
 * @param connection Active browser-session connection configuration.
 * @returns Discoverable non-system tables grouped by schema and table name.
 */
export async function listPostgresTables(connection: DatabaseSessionConnection) {
  return withExternalDb(connection.connectionString, async (db) => {
    const result = (await db.execute(sql`
      select
        table_schema as schema,
        table_name as name,
        table_schema || '.' || table_name as "displayName"
      from information_schema.tables
      where table_type = 'BASE TABLE'
        and table_schema not in ('pg_catalog', 'information_schema')
      order by table_schema, table_name
    `)) as unknown as { rows: DatabaseTableRef[] };

    return result.rows;
  });
}

/**
 * Reads the schema for a single external destination table.
 *
 * The import mapping UI needs column names, types, and nullability before it can
 * suggest or validate spreadsheet-to-table mappings, so this function queries
 * `information_schema.columns` for the selected table.
 *
 * @param params.connection Active browser-session connection configuration.
 * @param params.schema Destination schema name.
 * @param params.table Destination table name.
 * @returns Database table metadata used for mapping and validation.
 */
export async function describePostgresTable(params: {
  connection: DatabaseSessionConnection;
  schema: string;
  table: string;
}) {
  return withExternalDb(params.connection.connectionString, async (db) => {
    const result = (await db.execute(sql`
      select
        column_name as name,
        data_type as type,
        is_nullable = 'YES' as nullable
      from information_schema.columns
      where table_schema = ${params.schema}
        and table_name = ${params.table}
      order by ordinal_position
    `)) as { rows: Array<{ name: string; type: string; nullable: boolean }> };

    return {
      table: {
        schema: params.schema,
        name: params.table,
        displayName: `${params.schema}.${params.table}`,
      },
      columns: result.rows,
    } satisfies DatabaseTableSchema;
  });
}

/**
 * Reads rows from an external table so they can be normalized into a campaign import preview.
 *
 * This is the read-side counterpart to the existing save/import database flow. It allows
 * Supabase/Postgres tables to become lead sources directly, without requiring an XLS export.
 *
 * @param params.connection Active browser-session connection configuration.
 * @param params.schema Source schema name.
 * @param params.table Source table name.
 * @returns Raw table rows as plain objects.
 */
export async function fetchRowsFromPostgresTable(params: {
  connection: DatabaseSessionConnection;
  schema: string;
  table: string;
}) {
  return withExternalDb(params.connection.connectionString, async (db) => {
    const result = (await db.execute(
      sql.raw(
        `select * from ${quoteIdentifier(params.schema)}.${quoteIdentifier(params.table)}`,
      ),
    )) as { rows: Array<Record<string, unknown>> };

    return result.rows;
  });
}

/**
 * Infers candidate destination columns from the current import preview.
 *
 * This wrapper exists so the connector layer can expose database-specific schema
 * inference without duplicating the generic spreadsheet scanning logic.
 *
 * @param preview Parsed import preview containing headers and raw rows.
 * @returns Suggested column definitions for "create new table".
 */
export function inferPostgresColumns(preview: ImportPreview): InferredDatabaseColumn[] {
  return inferDatabaseColumns({
    headers: preview.headers,
    rows: preview.rows.map((row) => row.raw),
  });
}

/**
 * Suggests spreadsheet-to-table mappings by normalized name comparison.
 *
 * The goal is to reduce manual mapping work when a destination table already exists.
 * We normalize both sides before comparing so headers like `Clinic Name` can still
 * map cleanly to columns like `clinic_name`.
 *
 * @param params.headers Spreadsheet headers from the import preview.
 * @param params.schema Destination table schema metadata.
 * @returns Mapping suggestions that the user can accept or override.
 */
export function buildSuggestedMappings(params: {
  headers: string[];
  schema: DatabaseTableSchema;
}) {
  const byNormalizedDestination = new Map(
    params.schema.columns.map((column) => [normalizeIdentifier(column.name), column.name]),
  );

  return params.headers.map((header) => ({
    sourceColumn: header,
    destinationColumn: byNormalizedDestination.get(normalizeIdentifier(header)),
  })) satisfies DatabaseImportColumnMapping[];
}

/**
 * Creates a new external Postgres table from the inferred spreadsheet schema.
 *
 * This powers the "create new table" branch of the database import workflow.
 * Column names are normalized again here so edited or inferred names remain valid
 * Postgres identifiers before the table is created.
 *
 * @param params.connection Active browser-session connection configuration.
 * @param params.schema Destination schema that should own the table.
 * @param params.tableName User-provided or inferred table name.
 * @param params.columns Column definitions approved by the user.
 * @returns The created table description fetched back from the destination DB.
 */
export async function createPostgresTable(params: {
  connection: DatabaseSessionConnection;
  schema: string;
  tableName: string;
  columns: InferredDatabaseColumn[];
}) {
  return withExternalDb(params.connection.connectionString, async (db) => {
    const normalizedTableName = normalizeIdentifier(params.tableName);
    const columnSql = params.columns.map((column) => {
      const name = normalizeIdentifier(column.suggestedName || column.sourceHeader);
      const type = column.suggestedType || "text";
      const nullable = column.nullable ? "" : " not null";

      return `${quoteIdentifier(name)} ${type}${nullable}`;
    });

    await db.execute(
      sql.raw(
        `create table if not exists ${quoteIdentifier(params.schema)}.${quoteIdentifier(normalizedTableName)} (${columnSql.join(", ")})`,
      ),
    );

    return describePostgresTable({
      connection: params.connection,
      schema: params.schema,
      table: normalizedTableName,
    });
  });
}

/**
 * Inserts the current preview rows into an existing or newly created table.
 *
 * The function only writes mapped columns, parameterizes row values through Drizzle,
 * and leaves identifiers explicitly quoted. It exists to keep the import write path
 * centralized and reusable regardless of whether the table was discovered or created
 * during the current workflow.
 *
 * @param params.connection Active browser-session connection configuration.
 * @param params.schema Destination schema name.
 * @param params.table Destination table name.
 * @param params.mappings Approved source-to-destination column mappings.
 * @param params.preview Parsed import preview whose rows should be inserted.
 * @returns Insert summary used for success messaging in the UI.
 */
export async function insertRowsIntoPostgresTable(params: {
  connection: DatabaseSessionConnection;
  schema: string;
  table: string;
  mappings: DatabaseImportColumnMapping[];
  preview: ImportPreview;
}) {
  return withExternalDb(params.connection.connectionString, async (db) => {
    const activeMappings = params.mappings.filter(
      (mapping): mapping is DatabaseImportColumnMapping & { destinationColumn: string } =>
        Boolean(mapping.destinationColumn),
    );
    const eligibleRows = params.preview.rows.filter((row) => row.isValid);

    if (activeMappings.length === 0) {
      throw new Error("At least one column must be mapped before saving.");
    }

    if (eligibleRows.length === 0) {
      throw new Error("No valid rows are available to insert into the destination table.");
    }

    const valuesSql = eligibleRows.map((row) =>
      sql`(${sql.join(
        activeMappings.map((mapping) => {
          const value = row.raw[mapping.sourceColumn];
          return value == null || value === "" ? sql`null` : sql`${value}`;
        }),
        sql.raw(", "),
      )})`,
    );

    const insertStatement = sql.join(
      [
        sql.raw(
          `insert into ${quoteIdentifier(params.schema)}.${quoteIdentifier(params.table)} (${activeMappings
            .map((mapping) => quoteIdentifier(mapping.destinationColumn))
            .join(", ")}) values `,
        ),
        sql.join(valuesSql, sql.raw(", ")),
      ],
      sql.raw(""),
    );

    await db.execute(insertStatement);

    return {
      insertedCount: eligibleRows.length,
    };
  });
}
