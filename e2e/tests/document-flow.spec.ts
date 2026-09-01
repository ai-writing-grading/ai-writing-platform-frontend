import { expect, test, type Page } from "@playwright/test";

const E2E_EMAIL = "student.e2e@local.aiwriting.dev";
const E2E_PASSWORD = "E2ePass123!";
const DOCUMENT_NAME = "e2e-essay.txt";
const MOCK_RESULT = {
  inference_id: "e2e-inference-0001",
  document_id: "e2e-editor-document-0001",
  score: 86,
  grade: "B",
  confidence: 0.94,
  rubric: [{ dimension: "Structure", score: 86, feedback: "Clear and coherent." }],
  overall_feedback: "The argument is clear and well organised.",
  improvement_tips: ["Add one concrete example."],
  model_used: "mock",
  tokens_used: 42,
  flagged_for_review: false,
  cached: false,
};

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

test("invalid login shows an authentication error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(E2E_EMAIL);
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();

  await expect(page.getByText("Invalid email or password.")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("registration validates the verification code format", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "register", exact: true }).click();
  await page.getByLabel("Email").fill("new.student@local.aiwriting.dev");
  const code = page.getByLabel("Verification code");
  await code.fill("123");
  await page.getByLabel("Password").fill("E2ePass123!");
  await page.getByRole("button", { name: "Create Account", exact: true }).click();

  await expect(code).toHaveValue("123");
  expect(await code.evaluate((element) => !(element as HTMLInputElement).validity.valid)).toBe(true);
  await expect(page).toHaveURL(/\/login$/);
});

test("unauthenticated access to the dashboard is redirected", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});

test("student can save preferences and keep them after reload", async ({ page }) => {
  await login(page);
  await page.goto("/preferences");
  await page.getByRole("radio", { name: /Advanced/ }).check();
  await page.getByRole("radio", { name: /Technique Focus/ }).check();
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();

  await expect(page.getByRole("button", { name: "✓ Settings Saved", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("radio", { name: /Advanced/ })).toBeChecked();
  await expect(page.getByRole("radio", { name: /Technique Focus/ })).toBeChecked();
});

test("editor renders a grading result and refined writing", async ({ page }) => {
  await login(page);
  await page.route("**/api/v1/inference/generate", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_RESULT) });
  });
  await page.route("**/api/v1/inference/refine", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ refined_text: "Libraries create inclusive opportunities for every learner." }),
    });
  });

  await page.goto("/editor");
  await page.getByPlaceholder("Paste or type your essay here…").fill(
    "Libraries provide reliable information and support equal access to learning.",
  );
  await page.getByRole("button", { name: "Grade My Writing", exact: true }).click();

  await expect(page.locator("main")).toContainText(/86\s*\/ 100/);
  await expect(page.getByText("The argument is clear and well organised.")).toBeVisible();
  await page.getByRole("button", { name: "Refine My Writing", exact: true }).click();
  await expect(page.getByText("Libraries create inclusive opportunities for every learner.")).toBeVisible();
});

test("upload cannot be submitted before a file is selected", async ({ page }) => {
  await login(page);
  await page.goto("/upload");
  await expect(page.getByRole("button", { name: "Upload & Process", exact: true })).toBeDisabled();
});

test("batch evaluation validates empty input", async ({ page }) => {
  await login(page);
  await page.goto("/batch");
  await page.getByRole("button", { name: "Submit Batch", exact: true }).click();

  await expect(page.getByText('No essays found. Separate essays with "---".')).toBeVisible();
});

test("logout clears the session and returns to login", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Logout", exact: true }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "Sign In", exact: true })).toBeVisible();
});
