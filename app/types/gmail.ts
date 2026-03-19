export interface BuildGmailRawMessageParams {
  bodyHtml: string;
  bodyText: string;
  fromEmail: string;
  subject: string;
  toEmail: string;
}

export interface SendGmailMessageParams {
  accessToken: string;
  bodyHtml: string;
  bodyText: string;
  fromEmail: string;
  subject: string;
  toEmail: string;
}

export interface GmailSendResponse {
  error?: {
    code?: number;
    message?: string;
  };
  id?: string;
}
