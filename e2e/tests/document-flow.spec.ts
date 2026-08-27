import { expect, test, type Page } from "@playwright/test";

const E2E_EMAIL = "student.e2e@local.aiwriting.dev";
const E2E_PASSWORD = "E2ePass123!";
const DOCUMENT_NAME = "e2e-essay.txt";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(E2E_EMAIL);
  await page.getByLabel("Password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test("unauthenticated dashboard access redirects to login", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: "AI Writing Platform" }),
  ).toBeVisible();
});

test("student can log in, upload a document, and open its result", async ({
  page,
}) => {
  await login(page);

  await page.goto("/upload");
  await page.locator('input[type="file"]').setInputFiles({
    name: DOCUMENT_NAME,
    mimeType: "text/plain",
    buffer: Buffer.from(
      "Public libraries strengthen communities by giving learners equal access to reliable information. They also provide quiet study spaces and guidance from trained staff. For these reasons, continued investment in libraries supports both education and social inclusion.",
    ),
  });
  await page.getByRole("button", { name: "Upload & Process" }).click();

  await expect(
    page.getByRole("heading", { name: "Processing Complete" }),
  ).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(DOCUMENT_NAME)).toBeVisible();
  await expect(page.getByText(/\/ 100$/)).toBeVisible();

  await page.getByRole("link", { name: "Dashboard" }).click();
  const documentLink = page.getByRole("link").filter({
    hasText: DOCUMENT_NAME,
  });
  await expect(documentLink).toBeVisible({ timeout: 15_000 });
  await documentLink.click();

  await expect(page.getByRole("heading", { name: DOCUMENT_NAME })).toBeVisible();
  await expect(page.getByText("Summary")).toBeVisible();
  await expect(page.getByText("Model: mock")).toBeVisible();
});
