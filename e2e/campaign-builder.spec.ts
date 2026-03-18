import { expect, test } from "@playwright/test";
import path from "node:path";

const leadsFixturePath = path.join(process.cwd(), "e2e/fixtures/leads.csv");

test("imports leads, creates drafts, regenerates, and sends with mocked APIs", async ({
  page,
}) => {
  await page.route("**/api/ai/regenerate", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        data: {
          recipientId: "recipient_mocked",
          subject: "Refined intro for North Clinic",
          body: "Rewritten outreach body for North Clinic.",
          reasoning: "Tightened the opening.",
        },
      }),
    });
  });

  await page.route("**/api/send/bulk", async (route) => {
    const payload = route.request().postDataJSON() as {
      sendJobId: string;
      recipients: Array<{ id: string }>;
    };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        data: {
          sendJobId: payload.sendJobId,
          results: payload.recipients.map((recipient, index) =>
            index === 0
              ? {
                  recipientId: recipient.id,
                  status: "sent",
                  resendId: "resend_mocked_1",
                }
              : {
                  recipientId: recipient.id,
                  status: "failed",
                  errorMessage: "Mailbox full",
                },
          ),
        },
      }),
    });
  });

  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(leadsFixturePath);

  await expect(page.getByRole("dialog")).toContainText("Review imported rows");
  await expect(page.getByText("4 rows")).toBeVisible();
  await expect(page.getByText("2 valid")).toBeVisible();
  await expect(page.getByText("2 invalid")).toBeVisible();

  await page.getByRole("button", { name: "Continue to message setup" }).click();

  await expect(page.getByRole("dialog")).toContainText("Define campaign message");
  await page.getByLabel("Campaign name").fill("Clinic outreach");
  await page.getByLabel("Global subject").fill("Helping {{clinic_name}} reduce no-shows");
  await page
    .getByLabel("Global body template")
    .fill("Hi {{clinic_name}},\n\nI wanted to share a quick idea for {{address}}.");
  await page.getByRole("button", { name: "Create recipient drafts" }).click();

  await expect(page.getByText("Send queue")).toBeVisible();
  await expect(page.getByText("North Clinic")).toBeVisible();
  await expect(page.getByText("South Clinic")).toBeVisible();

  await page.getByRole("button", { name: "Regenerate" }).first().click();
  await expect(page.getByLabel("Subject").first()).toHaveValue(
    "Refined intro for North Clinic",
  );
  await expect(page.getByLabel("Body").first()).toHaveValue(
    "Rewritten outreach body for North Clinic.",
  );

  await page.getByRole("button", { name: "Send selected" }).click();
  await expect(page.getByText("1 sent")).toBeVisible();
  await expect(page.getByText("1 failed")).toBeVisible();
  await expect(page.getByText("Mailbox full")).toBeVisible();
});

test("keeps continue disabled when an upload has no valid recipients", async ({ page }) => {
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles({
    name: "invalid-leads.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "email,clinic_name\ninvalid-email,Clinic A\nmissing-at-symbol,Clinic B\n",
      "utf8",
    ),
  });

  await expect(page.getByRole("dialog")).toContainText("Review imported rows");
  await expect(page.getByText("0 valid")).toBeVisible();
  await expect(page.getByText("2 invalid")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue to message setup" }),
  ).toBeDisabled();
});
