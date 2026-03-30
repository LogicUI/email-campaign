export interface Attachment {
  filename: string;
  contentType: string;
  data: string; // base64 encoded file data
  size?: number; // in bytes
  originalSize?: number; // pre-optimization size in bytes
  width?: number; // intrinsic image width in pixels
  height?: number; // intrinsic image height in pixels
  isInline?: boolean; // true if image should be embedded in email body
  contentId?: string; // unique Content-ID for inline images (e.g., "img_abc123")
}

export interface BuildGmailRawMessageParams {
  bodyHtml: string;
  bodyText: string;
  editorJson?: string; // TipTap JSON for rich content (optional, for extracting HTML)
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
