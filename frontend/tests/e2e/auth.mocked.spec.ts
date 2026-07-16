import { expect, test } from "./fixtures/app";

test("anonymous users are redirected away from protected routes", async ({ page, app }) => {
  await app.usePersona("anonymous");

  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
});

test("registration accepts valid details and the user can continue into a signed-in session", async ({
  page,
  app,
}) => {
  await app.usePersona("registered-no-data");

  await page.goto("/register");
  await page.getByRole("button", { name: "Acknowledge" }).click();
  await page.getByRole("textbox", { name: "Username" }).fill("playwright-user");
  await page.getByRole("textbox", { name: /^Password$/ }).fill("Password1");
  await page.getByRole("textbox", { name: /^Confirm Password$/ }).fill("Password1");
  await page.getByRole("checkbox").click();
  await page.getByRole("button", { name: "Create Account" }).click();

  await app.login();
  await expect(page.getByRole("dialog", { name: "Welcome to Dedicate" })).toBeVisible();
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.getByRole("button", { name: "Help" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
});

test("cookie notice can be acknowledged on a public route", async ({ page, app }) => {
  await app.usePersona("anonymous");

  await page.goto("/");
  const notice = page.getByLabel("Cookie notice");

  await expect(notice.getByRole("heading", { name: "Essential cookies and storage only" })).toBeVisible();
  await expect(notice.getByRole("link", { name: "Privacy Policy" })).toBeVisible();
  await expect(notice.getByRole("link", { name: "Terms of Service" })).toBeVisible();

  await notice.getByRole("button", { name: "Acknowledge" }).click();

  await expect(notice).toHaveCount(0);
});

test("auth mode switches update the route", async ({ page, app }) => {
  await app.usePersona("anonymous");

  await page.goto("/login");
  await page.getByRole("button", { name: "Acknowledge" }).click();
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page).toHaveURL(/\/register$/);

  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("MFA login handles invalid and valid verification codes", async ({ page, app }) => {
  await app.usePersona("mfa-required");
  await app.login({ expectMfa: true });

  await page.getByLabel("Authentication Code").fill("000000");
  await page.getByRole("button", { name: "Verify Code" }).click();
  await expect(page.getByText("Two-Factor Authentication")).toBeVisible();

  await page.getByLabel("Authentication Code").fill("123456");
  await page.getByRole("button", { name: "Verify Code" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("dialog", { name: "Welcome to Dedicate" })).toBeVisible();
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.getByRole("button", { name: "Help" })).toBeVisible();
});

test("expired sessions recover on protected route access when refresh succeeds", async ({ page, app }) => {
  await app.usePersona("expired-session-recoverable");

  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("button", { name: "Help" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
  await page.getByRole("button", { name: "Help" }).click();
  await expect(page.getByRole("dialog", { name: "Welcome to Dedicate" })).toBeVisible();
  await page.getByRole("button", { name: "Skip" }).click();
});

test("expired sessions fall back to login when refresh is rejected", async ({ page, app }) => {
  await app.usePersona("expired-session-nonrecoverable");

  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
});
