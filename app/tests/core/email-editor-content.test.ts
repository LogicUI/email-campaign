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

  it("extracts email html with cid images after editor preview rendering", () => {
    const html = extractHtmlForEmail(
      undefined,
      '<p><img src="data:image/png;base64,ZmFrZS1pbWFnZS1kYXRh" data-content-id="img_demo_123" data-filename="demo.png" /></p>',
      [inlineAttachment],
    );

    expect(html).toContain('src="cid:img_demo_123"');
  });
});
