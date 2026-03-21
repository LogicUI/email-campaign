import { z } from "zod";

const requiredString = (message: string) => z.string().trim().min(1, message);

export const listGoogleDriveFilesRequestSchema = z.object({
  query: z.string().trim().optional(),
});

export const listGoogleSheetWorksheetsRequestSchema = z.object({
  spreadsheetId: requiredString("Spreadsheet id is required."),
});

export const importGoogleSheetRequestSchema = z.object({
  spreadsheetId: requiredString("Spreadsheet id is required."),
  worksheetTitle: requiredString("Worksheet title is required."),
});

export const exportGoogleSheetResultsRequestSchema = z.object({
  spreadsheetId: requiredString("Spreadsheet id is required."),
  worksheetTitle: z.string().trim().optional(),
  campaignName: requiredString("Campaign name is required."),
  senderEmail: requiredString("Sender email is required."),
  globalSubject: z.string(),
  recipients: z
    .array(
      z.object({
        id: requiredString("Recipient id is required."),
        rowIndex: z.number().int(),
        email: requiredString("Recipient email is required."),
        recipient: z.string().trim().optional(),
        subject: z.string(),
        status: requiredString("Recipient status is required."),
        errorMessage: z.string().trim().optional(),
        providerMessageId: z.string().trim().optional(),
        sourceFileName: z.string().trim().optional(),
        sourceSheetName: z.string().trim().optional(),
        lastSendAttemptAt: z.string().trim().optional(),
      }),
    )
    .min(1, "At least one recipient result is required."),
});
