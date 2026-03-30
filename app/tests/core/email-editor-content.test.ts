import { describe, expect, it } from "vitest";

import {
  prepareEmailEditorContent,
  serializeEmailEditorHtml,
} from "@/core/email/editor-content";
import { extractHtmlForEmail } from "@/core/email/extract-html-for-email";
import type { Attachment } from "@/types/gmail";

const inlineAttachment: Attachment = {
  filename: "demo.png",
  contentType: "image/png",
  data: "ZmFrZS1pbWFnZS1kYXRh",
  isInline: true,
  contentId: "img_demo_123",
};

describe("email editor content", () => {
  it("recovers a TipTap document string stored in the html body field", () => {
    const result = prepareEmailEditorContent({
      content: JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Recovered body copy" }],
          },
        ],
      }),
      attachments: [],
    });

    expect(result.comparisonMode).toBe("json");
    expect(result.shouldPersistNormalization).toBe(true);
    expect(result.displayContent).toMatchObject({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Recovered body copy" }],
        },
      ],
    });
  });

  it("renders cid-backed inline images with browser-preview sources in the editor", () => {
    const result = prepareEmailEditorContent({
      content:
        '<p>Hello</p><p><img src="cid:img_demo_123" data-content-id="img_demo_123" data-filename="demo.png" /></p>',
      attachments: [inlineAttachment],
    });

    expect(result.comparisonMode).toBe("html");
    expect(typeof result.displayContent).toBe("string");
    expect(result.displayContent).toContain(
      'src="data:image/png;base64,ZmFrZS1pbWFnZS1kYXRh"',
    );
    expect(result.displayContent).toContain('data-content-id="img_demo_123"');
  });

  it("serializes editor preview images back to cid references", () => {
    const serialized = serializeEmailEditorHtml(
      '<p><img src="data:image/png;base64,ZmFrZS1pbWFnZS1kYXRh" data-content-id="img_demo_123" data-filename="demo.png" /></p>',
    );

    expect(serialized).toContain('src="cid:img_demo_123"');
    expect(serialized).toContain('data-content-id="img_demo_123"');
  });

  it("preserves resized image dimensions when serializing editor html", () => {
    const serialized = serializeEmailEditorHtml(
      '<p><img src="data:image/png;base64,ZmFrZS1pbWFnZS1kYXRh" data-content-id="img_demo_123" data-filename="demo.png" width="480" height="320" /></p>',
    );

    expect(serialized).toContain('src="cid:img_demo_123"');
    expect(serialized).toContain('width="480"');
    expect(serialized).toContain('height="320"');
  });

  it("extracts email html with cid images after editor preview rendering", () => {
    const html = extractHtmlForEmail(
      undefined,
      '<p><img src="data:image/png;base64,ZmFrZS1pbWFnZS1kYXRh" data-content-id="img_demo_123" data-filename="demo.png" /></p>',
      [inlineAttachment],
    );

    expect(html).toContain('src="cid:img_demo_123"');
  });

  it("removes legacy placeholder highlight classes from html content", () => {
    const result = prepareEmailEditorContent({
      content:
        '<p>Hello <span data-field-name="clinic_view" class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 text-blue-700">{{clinic_view}}</span></p>',
      attachments: [],
    });

    expect(result.comparisonMode).toBe("html");
    expect(result.shouldPersistNormalization).toBe(true);
    expect(typeof result.displayContent).toBe("string");
    expect(result.displayContent).toContain(
      '<span data-field-name="clinic_view">{{clinic_view}}</span>',
    );
    expect(result.displayContent).not.toContain("bg-blue-100");
    expect(result.displayContent).not.toContain("text-blue-700");
  });

  it("collapses resolved placeholder spans to plain text for editor display", () => {
    const result = prepareEmailEditorContent({
      content: '<p>Hello <span data-field-name="firm_name">Apex Law</span> team</p>',
      attachments: [],
    });

    expect(result.comparisonMode).toBe("html");
    expect(result.shouldPersistNormalization).toBe(true);
    expect(typeof result.displayContent).toBe("string");
    expect(result.displayContent).toContain("<p>Hello Apex Law team</p>");
    expect(result.displayContent).not.toContain("data-field-name");
  });
});
