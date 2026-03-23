export interface Attachment {
  filename: string;
  contentType: string;
  data: string; // base64 encoded file data
  size?: number; // in bytes
}

export interface BuildGmailRawMessageParams {
  bodyHtml: string;
  bodyText: string;
  ccEmails?: string[];
  fromEmail: string;
  subject: string;
  toEmail: string;
  attachments?: Attachment[];
}

export interface SendGmailMessageParams {
  accessToken: string;
  bodyHtml: string;
  bodyText: string;
  ccEmails?: string[];
  fromEmail: string;
  subject: string;
  toEmail: string;
  attachments?: Attachment[];
}

export interface GmailSendResponse {
  error?: {
    code?: number;
    message?: string;
  };
  id?: string;
}
