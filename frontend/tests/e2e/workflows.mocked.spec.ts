import type { Page, Request } from "@playwright/test";
import { expect, test } from "./fixtures/app";

async function dismissCookieNoticeIfPresent(page: Page) {
  const notice = page.getByLabel("Cookie notice");
  const acknowledgeButton = notice.getByRole("button", { name: "Acknowledge" });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const isVisible = await acknowledgeButton.isVisible().catch(() => false);
    if (!isVisible) {
      return;
    }

    try {
      await acknowledgeButton.click({ timeout: 2_000, force: true });
      await expect(notice).toHaveCount(0, { timeout: 3_000 });
      return;
    } catch {
      // Mobile WebKit can detach/re-render the banner during tap.
      await page.waitForTimeout(150);
    }
  }

  // Final assertion if it kept flaking; if still present, fail loudly.
  await expect(notice).toHaveCount(0);
}

async function expectProgrammesPageReady(page: Page) {
  await expect(page.getByRole("tab", { name: "All" })).toHaveAttribute("aria-selected", "true");
}

test("authenticated users can create a split from seeded workouts", async ({ page, app }) => {
  await app.usePersona("authenticated-seeded");
  await app.login();

  await app.navigate("/splits/create");
  await page.getByRole("checkbox", { name: /Push Day A/i }).click();
  await page.getByRole("button", { name: "Next" }).click();

  await page.getByPlaceholder("Enter split name...").fill("Competition Prep");
  await page.getByRole("button", { name: "Complete" }).click();

  await expect(page.getByRole("heading", { name: "Competition Prep" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Setup" })).toBeVisible();
});

test("workouts reuse cached data when navigating away and back", async ({ page, app }) => {
  await app.usePersona("authenticated-seeded");
  await app.login();

  let workoutRequestCount = 0;
  const countWorkoutRequests = (request: Request) => {
    if (request.method() === "GET" && request.url().includes("/workout/workout-templates")) {
      workoutRequestCount += 1;
    }
  };
  page.on("request", countWorkoutRequests);

  await app.navigate("/workouts");

  await expect(page.getByRole("heading", { name: "All Workouts" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Push Day A/i }).first()).toBeVisible();
  await page.waitForTimeout(150);
  const workoutRequestsAfterFirstVisit = workoutRequestCount;

  await app.navigate("/dashboard");
  await page.goBack();

  await expect(page).toHaveURL(/\/workouts$/);
  await expect(page.getByRole("link", { name: /Push Day A/i }).first()).toBeVisible();
  await page.waitForTimeout(150);
  expect(workoutRequestCount).toBe(workoutRequestsAfterFirstVisit);

  page.off("request", countWorkoutRequests);
});

test("dashboard initial load stays within the lightweight request budget", async ({ page, app }) => {
  await app.usePersona("authenticated-seeded");

  const counts = {
    dashboardSummary: 0,
    splitList: 0,
    workoutTemplates: 0,
    workoutEntries: 0,
  };

  const countDashboardRequests = (request: Request) => {
    if (request.method() !== "GET") {
      return;
    }

    const url = request.url();
    if (url.includes("/workout/dashboard/summary")) counts.dashboardSummary += 1;
    if (url.includes("/workout/splits")) counts.splitList += 1;
    if (url.includes("/workout/workout-templates")) counts.workoutTemplates += 1;
    if (url.includes("/workout/workout-entries")) counts.workoutEntries += 1;
  };
  page.on("request", countDashboardRequests);

  await app.login();

  await expect(page.getByRole("button", { name: "Refresh dashboard" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Help" })).toBeVisible();
  await page.waitForTimeout(150);

  expect(counts.dashboardSummary).toBe(1);
  expect(counts.splitList).toBe(0);
  expect(counts.workoutTemplates).toBe(0);
  expect(counts.workoutEntries).toBe(0);
  await expect(page.getByTestId("auth-route-loading")).toHaveCount(0);
  await expect(page.getByTestId("route-loading")).toHaveCount(0);

  page.off("request", countDashboardRequests);
});

test("active workout navigation loads entry history on the create and entries screens", async ({ page, app }) => {
  await app.usePersona("authenticated-seeded");

  const entryHistoryRequests: string[] = [];
  const countEntryHistoryRequests = (request: Request) => {
    if (request.method() === "GET" && request.url().includes("/workout/workout-entries")) {
      entryHistoryRequests.push(request.url());
    }
  };
  page.on("request", countEntryHistoryRequests);

  await app.login();
  await dismissCookieNoticeIfPresent(page);

  await app.navigate("/workout/workout-a");
  await expect(page.getByRole("heading", { name: "Push Day A" })).toBeVisible();

  await app.navigate("/workout/workout-a/create?tab=view");
  await expect(page.getByRole("tab", { name: "Finish" })).toBeVisible();
  await expect(page.getByTestId("create-workout-entry-loading")).toHaveCount(0);
  await page.waitForTimeout(150);
  expect(entryHistoryRequests).toHaveLength(1);

  await app.navigate("/workout/workout-a?tab=entries");
  await expect(page.getByRole("tab", { name: "Entries" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bench Press" }).first()).toBeVisible();
  await page.waitForTimeout(150);
  expect(entryHistoryRequests).toHaveLength(2);
  expect(entryHistoryRequests[0]).toContain("workoutTemplateId=workout-a");
  expect(entryHistoryRequests[1]).toContain("workoutTemplateId=workout-a");

  page.off("request", countEntryHistoryRequests);
});

test("split and programme pages reuse cached data when revisited", async ({ page, app }) => {
  await app.usePersona("authenticated-seeded");
  await app.login();

  let splitRequestCount = 0;
  const countSplitRequests = (request: Request) => {
    if (request.method() === "GET" && request.url().includes("/workout/splits")) {
      splitRequestCount += 1;
    }
  };
  page.on("request", countSplitRequests);

  await app.navigate("/periodisation?tab=splits");

  await expect(page.getByRole("heading", { name: "Periodisation" })).toBeVisible();
  await expect(page.getByText("Upper Lower")).toBeVisible();
  await page.waitForTimeout(150);
  const splitRequestsAfterFirstVisit = splitRequestCount;

  await app.navigate("/dashboard");
  await page.goBack();

  await expect(page).toHaveURL(/\/periodisation\?tab=splits$/);
  await expect(page.getByText("Upper Lower")).toBeVisible();
  await page.waitForTimeout(150);
  expect(splitRequestCount).toBe(splitRequestsAfterFirstVisit);

  page.off("request", countSplitRequests);

  let programmeRequestCount = 0;
  const countProgrammeRequests = (request: Request) => {
    if (request.method() === "GET" && request.url().includes("/workout/programmes/split/split-a")) {
      programmeRequestCount += 1;
    }
  };
  page.on("request", countProgrammeRequests);

  await app.navigate("/periodisation/splits/split-a?tab=all-programmes");

  await expectProgrammesPageReady(page);
  await page.waitForTimeout(150);
  const programmeRequestsAfterFirstVisit = programmeRequestCount;

  await app.navigate("/periodisation?tab=all-programmes");
  await page.goBack();

  await expect(page).toHaveURL(/\/periodisation\/splits\/split-a\?tab=all-programmes$/);
  await expectProgrammesPageReady(page);
  await page.waitForTimeout(150);
  expect(programmeRequestCount).toBe(programmeRequestsAfterFirstVisit);

  page.off("request", countProgrammeRequests);
});

test("empty states guide a new user toward creating workouts and splits", async ({ page, app }) => {
  await app.usePersona("registered-no-data");
  await app.login();

  await app.navigate("/workouts");
  await expect(page.getByRole("heading", { name: "All Workouts" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Create Workout/i })).toBeVisible();

  await app.navigate("/periodisation?tab=splits");
  await expect(page.getByRole("button", { name: /Create New Split/i })).toBeVisible();
});
