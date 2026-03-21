import type { GoogleDriveFileItem } from "@/types/google";

const GOOGLE_SHEETS_MIME_TYPE = "application/vnd.google-apps.spreadsheet";

interface GoogleDriveFilesResponse {
  files?: Array<{
    id?: string;
    name?: string;
    mimeType?: string;
    modifiedTime?: string;
    webViewLink?: string;
  }>;
}

type GoogleDriveFilePayload = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
};

function hasRequiredDriveFileFields(
  file: NonNullable<GoogleDriveFilesResponse["files"]>[number],
): file is GoogleDriveFilePayload {
  return Boolean(file?.id && file.name && file.mimeType);
}

async function fetchGoogleDrive<T>(accessToken: string, input: string) {
  const response = await fetch(input, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(payload || "Google Drive request failed.");
  }

  return (await response.json()) as T;
}

export async function listGoogleSpreadsheetFiles(params: {
  accessToken: string;
  query?: string;
}) {
  const search = params.query?.trim();
  const q = [
    `mimeType='${GOOGLE_SHEETS_MIME_TYPE}'`,
    "trashed=false",
    search ? `name contains '${search.replace(/'/g, "\\'")}'` : "",
  ]
    .filter(Boolean)
    .join(" and ");

  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("pageSize", "25");
  url.searchParams.set("orderBy", "modifiedTime desc,name");
  url.searchParams.set(
    "fields",
    "files(id,name,mimeType,modifiedTime,webViewLink)",
  );
  url.searchParams.set("q", q);

  const payload = await fetchGoogleDrive<GoogleDriveFilesResponse>(
    params.accessToken,
    url.toString(),
  );

  return (payload.files ?? [])
    .filter(hasRequiredDriveFileFields)
    .map(
      (file): GoogleDriveFileItem => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        modifiedTime: file.modifiedTime,
        webViewLink: file.webViewLink,
      }),
    );
}
