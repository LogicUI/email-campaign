import { describe, expect, it } from "vitest";

import { detectRecipientColumn } from "@/core/excel/detect-recipient-column";

describe("detectRecipientColumn", () => {
  it("prefers exact semantic matches over generic name fields", () => {
    const detection = detectRecipientColumn(
      [
        {
          email: "hello@example.com",
          owner_name: "Jordan Lee",
          clinic_name: "North Clinic",
        },
      ],
      ["email", "owner_name", "clinic_name"],
      "email",
    );

    expect(detection.selected).toBe("clinic_name");
    expect(detection.candidates).toEqual(["clinic_name", "owner_name"]);
  });

  it("excludes the selected email column from recipient candidates", () => {
    const detection = detectRecipientColumn(
      [
        {
          email: "hello@example.com",
          contact_email: "owner@example.com",
          recipient_name: "Jordan Lee",
        },
      ],
      ["email", "contact_email", "recipient_name"],
      "email",
    );

    expect(detection.selected).toBe("recipient_name");
    expect(detection.candidates).toEqual(["recipient_name"]);
  });

  it("returns candidates without preselecting a low-confidence generic name field", () => {
    const detection = detectRecipientColumn(
      [
        {
          email: "hello@example.com",
          owner_name: "Jordan Lee",
        },
      ],
      ["email", "owner_name"],
      "email",
    );

    expect(detection.selected).toBeUndefined();
    expect(detection.candidates).toEqual(["owner_name"]);
  });
});
