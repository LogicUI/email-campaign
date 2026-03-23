import { buildGmailRawMessage } from "@/core/email/build-gmail-raw-message";
import type { GmailSendResponse, SendGmailMessageParams } from "@/types/gmail";

export async function sendGmailMessage(params: SendGmailMessageParams) {
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      raw: buildGmailRawMessage({
        bodyHtml: params.bodyHtml,
        bodyText: params.bodyText,
        ccEmails: params.ccEmails,
        fromEmail: params.fromEmail,
        subject: params.subject,
        toEmail: params.toEmail,
        attachments: params.attachments,
      }),
    }),
  });

  const payload = (await response.json()) as GmailSendResponse;

  if (!response.ok || !payload.id) {
    throw new Error(payload.error?.message ?? "Gmail send failed.");
  }

  return {
    id: payload.id,
  };
}
