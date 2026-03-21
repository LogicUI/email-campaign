import { expect, test } from "@playwright/test";

test("redirects unauthenticated users to the login page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Sign in to EmailAI" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in with Google" })).toBeVisible();
});

test("shows the dedicated login page when visited directly", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in to EmailAI" })).toBeVisible();
  await expect(page.getByText(/your Google email becomes the sender identity/i)).toBeVisible();
});
