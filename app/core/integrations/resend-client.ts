import { Resend } from "resend";

function getResendApiKey() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY.");
  }

  return apiKey;
}

export function getResendClient() {
  return new Resend(getResendApiKey());
}

export function getResendFromEmail() {
  const from = process.env.RESEND_FROM_EMAIL;

  if (!from) {
    throw new Error("Missing RESEND_FROM_EMAIL.");
  }

  return from;
}
