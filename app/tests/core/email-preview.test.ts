import { describe, expect, it } from "vitest";

import {
  buildEmailPreviewModel,
  buildTemplatedEmailPreviewModel,
} from "@/core/email/email-preview";
import type { Attachment } from "@/types/gmail";

const inlineAttachment: Attachment = {
  filename: "demo.png",
  contentType: "image/png",
  data: "ZmFrZS1pbWFnZS1kYXRh",
  size: 2048,
  isInline: true,
  contentId: "img_demo_123",
};

const fileAttachment: Attachment = {
  filename: "overview.pdf",
  contentType: "application/pdf",
  data: "ZmFrZS1wZGY=",
  size: 4096,
};

describe("email preview", () => {
  it("builds preview html while preserving cid-based send html and attachment grouping", () => {
    const result = buildEmailPreviewModel(
      '<p>Hello</p><p><img src="cid:img_demo_123" data-content-id="img_demo_123" data-filename="demo.png" /></p>',
      [inlineAttachment, fileAttachment],
    );

    expect(result.bodyHtml).toContain('src="cid:img_demo_123"');
    expect(result.previewHtml).toContain(
      'src="data:image/png;base64,ZmFrZS1pbWFnZS1kYXRh"',
    );
    expect(result.inlineAttachments).toHaveLength(1);
    expect(result.fileAttachments).toHaveLength(1);
    expect(result.fileAttachments[0]?.filename).toBe("overview.pdf");
  });

  it("resolves template placeholders before building the preview model", () => {
    const result = buildTemplatedEmailPreviewModel({
      subject: "Helping {{clinic_name}} reduce no-shows",
      body: "Hi {{clinic_name}},\n\nVisit us at {{address}}.",
      attachments: [],
      fields: {
        clinic_name: "North Clinic",
        address: "1 Main St",
      },
    });

    expect(result.subject).toBe("Helping North Clinic reduce no-shows");
    expect(result.body).toContain("North Clinic");
    expect(result.body).toContain("1 Main St");
    expect(result.previewHtml).toContain("North Clinic");
  });

  it("resolves placeholder spans inside html content for preview and send", () => {
    const result = buildTemplatedEmailPreviewModel({
      subject: "Hello {{clinic_name}}",
      body: '<p>Hello <span data-field-name="clinic_name">{{clinic_name}}</span></p>',
      attachments: [],
      fields: {
        clinic_name: "North Clinic",
      },
    });

    expect(result.subject).toBe("Hello North Clinic");
    expect(result.bodyHtml).toContain("North Clinic");
    expect(result.bodyHtml).not.toContain("{{clinic_name}}");
    expect(result.bodyHtml).not.toContain("data-field-name");
    expect(result.previewHtml).toContain("North Clinic");
    expect(result.previewHtml).not.toContain("data-field-name");
  });

  it("strips legacy placeholder highlight styling from preview html", () => {
    const result = buildEmailPreviewModel(
      '<p>Hello <span data-field-name="clinic_view" class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 text-blue-700">{{clinic_view}}</span></p>',
      [],
    );

    expect(result.previewHtml).toContain(
      '<span data-field-name="clinic_view">{{clinic_view}}</span>',
    );
    expect(result.previewHtml).not.toContain("bg-blue-100");
    expect(result.previewHtml).not.toContain("text-blue-700");
  });
});
