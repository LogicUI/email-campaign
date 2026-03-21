import { buildImportPreview } from "@/core/excel/build-import-preview";
import type { ImportPreview } from "@/types/campaign";
import type { GoogleSheetWorksheet } from "@/types/google";

interface GoogleSheetMetadataResponse {
  spreadsheetId: string;
  properties?: {
    title?: string;
  };
  sheets?: Array<{
    properties?: {
      sheetId?: number;
      title?: string;
      gridProperties?: {
        rowCount?: number;
        columnCount?: number;
      };
    };
  }>;
}

type GoogleSheetEntry = NonNullable<GoogleSheetMetadataResponse["sheets"]>[number];

interface GoogleSheetBatchValuesResponse {
  spreadsheetId?: string;
  valueRanges?: Array<{
    range?: string;
    values?: string[][];
  }>;
}

interface GoogleSheetAppendResponse {
  updates?: {
    updatedRange?: string;
    updatedRows?: number;
  };
}

type GoogleSheetProperties = {
  sheetId: number;
  title: string;
  gridProperties?: {
    rowCount?: number;
    columnCount?: number;
  };
};

async function fetchGoogleSheets<T>(accessToken: string, input: string, init?: RequestInit) {
  const response = await fetch(input, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(payload || "Google Sheets request failed.");
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

function hasWorksheetProperties(
  sheet: GoogleSheetEntry["properties"],
): sheet is GoogleSheetProperties {
  return Boolean(sheet?.title && typeof sheet.sheetId === "number");
}

function buildSpreadsheetUrl(spreadsheetId: string) {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
}

function rowsToObjects(values: string[][]) {
  const [headerRow = [], ...dataRows] = values;
  const headers = headerRow.map((value, index) => {
    const trimmed = value.trim();
    return trimmed || `column_${index + 1}`;
  });

  return dataRows.map((row) => {
    const record: Record<string, string> = {};

    headers.forEach((header, index) => {
      record[header] = row[index] ?? "";
    });

    return record;
  });
}

export async function getGoogleSpreadsheetMetadata(params: {
  accessToken: string;
  spreadsheetId: string;
}) {
  const url = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${params.spreadsheetId}`,
  );
  url.searchParams.set(
    "fields",
    "spreadsheetId,properties(title),sheets(properties(sheetId,title,gridProperties(rowCount,columnCount)))",
  );

  const payload = await fetchGoogleSheets<GoogleSheetMetadataResponse>(
    params.accessToken,
    url.toString(),
  );

  return {
    spreadsheetId: payload.spreadsheetId,
    spreadsheetTitle: payload.properties?.title ?? "Google Sheet",
    spreadsheetUrl: buildSpreadsheetUrl(payload.spreadsheetId),
    worksheets: (payload.sheets ?? [])
      .map((sheet) => sheet.properties)
      .filter(hasWorksheetProperties)
      .map(
        (sheet): GoogleSheetWorksheet => ({
          sheetId: sheet.sheetId,
          title: sheet.title,
          rowCount: sheet.gridProperties?.rowCount,
          columnCount: sheet.gridProperties?.columnCount,
        }),
      ),
  };
}

export async function importGoogleWorksheetAsPreview(params: {
  accessToken: string;
  spreadsheetId: string;
  worksheetTitle: string;
}): Promise<{
  preview: ImportPreview;
  spreadsheetTitle: string;
  spreadsheetUrl: string;
}> {
  const metadata = await getGoogleSpreadsheetMetadata({
    accessToken: params.accessToken,
    spreadsheetId: params.spreadsheetId,
  });
  const url = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${params.spreadsheetId}/values:batchGet`,
  );
  url.searchParams.set("ranges", params.worksheetTitle);
  url.searchParams.set("majorDimension", "ROWS");

  const payload = await fetchGoogleSheets<GoogleSheetBatchValuesResponse>(
    params.accessToken,
    url.toString(),
  );

  const values = payload.valueRanges?.[0]?.values ?? [];

  if (values.length < 2) {
    throw new Error("The selected worksheet does not contain a header row plus data rows.");
  }

  const rows = rowsToObjects(values);
  const preview = buildImportPreview({
    sourceType: "google_sheet",
    googleSpreadsheetId: params.spreadsheetId,
    googleSpreadsheetUrl: metadata.spreadsheetUrl,
    sourceFiles: [
      {
        fileName: metadata.spreadsheetTitle,
        sheetName: params.worksheetTitle,
      },
    ],
    sourceRows: rows.map((row, index) => ({
      raw: row,
      sourceFileName: metadata.spreadsheetTitle,
      sourceSheetName: params.worksheetTitle,
      originalRowIndex: index + 2,
    })),
  });

  return {
    preview,
    spreadsheetTitle: metadata.spreadsheetTitle,
    spreadsheetUrl: metadata.spreadsheetUrl,
  };
}

async function ensureWorksheet(params: {
  accessToken: string;
  spreadsheetId: string;
  worksheetTitle: string;
}) {
  const metadata = await getGoogleSpreadsheetMetadata({
    accessToken: params.accessToken,
    spreadsheetId: params.spreadsheetId,
  });

  if (metadata.worksheets.some((sheet) => sheet.title === params.worksheetTitle)) {
    return metadata;
  }

  await fetchGoogleSheets(
    params.accessToken,
    `https://sheets.googleapis.com/v4/spreadsheets/${params.spreadsheetId}:batchUpdate`,
    {
      method: "POST",
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: {
                title: params.worksheetTitle,
              },
            },
          },
        ],
      }),
    },
  );

  return metadata;
}

export async function appendCampaignResultsToGoogleSheet(params: {
  accessToken: string;
  spreadsheetId: string;
  worksheetTitle: string;
  campaignName: string;
  senderEmail: string;
  globalSubject: string;
  recipients: Array<{
    id: string;
    rowIndex: number;
    email: string;
    recipient?: string;
    subject: string;
    status: string;
    errorMessage?: string;
    providerMessageId?: string;
    sourceFileName?: string;
    sourceSheetName?: string;
    lastSendAttemptAt?: string;
  }>;
}) {
  const metadata = await ensureWorksheet({
    accessToken: params.accessToken,
    spreadsheetId: params.spreadsheetId,
    worksheetTitle: params.worksheetTitle,
  });

  const values = [
    [
      "Campaign",
      "Sender",
      "Global Subject",
      "Recipient ID",
      "Row Index",
      "Recipient",
      "Email",
      "Subject",
      "Status",
      "Error",
      "Provider Message ID",
      "Source File",
      "Source Sheet",
      "Last Send Attempt At",
      "Exported At",
    ],
    ...params.recipients.map((recipient) => [
      params.campaignName,
      params.senderEmail,
      params.globalSubject,
      recipient.id,
      String(recipient.rowIndex),
      recipient.recipient ?? "",
      recipient.email,
      recipient.subject,
      recipient.status,
      recipient.errorMessage ?? "",
      recipient.providerMessageId ?? "",
      recipient.sourceFileName ?? "",
      recipient.sourceSheetName ?? "",
      recipient.lastSendAttemptAt ?? "",
      new Date().toISOString(),
    ]),
  ];

  const payload = await fetchGoogleSheets<GoogleSheetAppendResponse>(
    params.accessToken,
    `https://sheets.googleapis.com/v4/spreadsheets/${params.spreadsheetId}/values/${encodeURIComponent(params.worksheetTitle)}!A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      body: JSON.stringify({
        majorDimension: "ROWS",
        values,
      }),
    },
  );

  return {
    spreadsheetId: params.spreadsheetId,
    spreadsheetUrl: metadata.spreadsheetUrl,
    worksheetTitle: params.worksheetTitle,
    updatedRange: payload.updates?.updatedRange,
    appendedRowCount: params.recipients.length,
  };
}
