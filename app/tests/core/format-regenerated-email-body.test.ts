import { describe, expect, it } from "vitest";

import { formatRegeneratedEmailBody } from "@/core/email/format-regenerated-email-body";

describe("formatRegeneratedEmailBody", () => {
  it("converts an unstructured email into paragraph HTML", () => {
    const html = formatRegeneratedEmailBody(
      "Dear {{clinic_name}} team, I’m reaching out to introduce Genesis1. It offers needle-free haemoglobin testing. We have already deployed a pilot unit. We would love the opportunity to present Genesis1 to your team. Best regards, John",
      [],
    );

    expect(html).toContain("<p>Dear ");
    expect(html).toContain("</p><p>I’m reaching out to introduce Genesis1.");
    expect(html).toContain("We would love the opportunity to present Genesis1 to your team.");
    expect(html).toContain("<p>Best regards,<br>John</p>");
  });

  it("keeps image placeholders as separate blocks", () => {
    const html = formatRegeneratedEmailBody(
      "Hello {{clinic_name}}, Here is the first section. {{image:image003.png}} Here is the second section. Regards, John",
      [],
    );

    expect(html).toContain("<p>{{image:image003.png}}</p>");
    expect(html).toContain("<p>Regards,<br>John</p>");
  });

  it("returns html input unchanged", () => {
    const html = "<p>Hello {{clinic_name}}</p><p>Regards,<br>John</p>";

    expect(formatRegeneratedEmailBody(html, [])).toBe(html);
  });
});
