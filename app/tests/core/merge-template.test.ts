import { describe, expect, it } from "vitest";

import { mergeTemplate } from "@/core/campaign/merge-template";

describe("mergeTemplate", () => {
  it("resolves plain text placeholders from imported fields", () => {
    expect(
      mergeTemplate("Hi {{firm_name}} team,", {
        firm_name: "Apex Law",
      }),
    ).toBe("Hi Apex Law team,");
  });

  it("replaces placeholder spans with plain resolved text", () => {
    const merged = mergeTemplate(
      '<p>Hello <span data-field-name="firm_name">{{firm_name}}</span> team,</p>',
      {
        firm_name: "Apex Law",
      },
    );

    expect(merged).toContain("Apex Law");
    expect(merged).not.toContain("{{firm_name}}");
    expect(merged).not.toContain("data-field-name");
  });
});
