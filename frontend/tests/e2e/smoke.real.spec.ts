import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

function uniqueUser() {
  return `smoke_${Date.now()}`;
}

async function dismissCookieNoticeIfPresent(page: Page) {
  const notice = page.getByLabel("Cookie notice");
  const acknowledgeButton = notice.getByRole("button", { name: "Acknowledge" });

  if (await acknowledgeButton.isVisible().catch(() => false)) {
    await acknowledgeButton.click();
    await expect(notice).toHaveCount(0);
  }
}

async function waitForInsightsPageReady(page: Page) {
  await dismissCookieNoticeIfPresent(page);
  await expect(page.getByRole("heading", { name: "Insights", level: 1 })).toBeVisible();
}

async function waitForChartsLibraryReady(page: Page) {
  await dismissCookieNoticeIfPresent(page);
  await expect(page.getByRole("heading", { name: "Lift detail", level: 1 })).toBeVisible();
}

test.setTimeout(120_000);

test("@smoke register, seed, and verify core flows against the real stack", async ({
  page,
  request,
  baseURL,
}) => {
  const username = uniqueUser();
  const password = "Password1";

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/register");
  await expect(page).toHaveURL(/\/register$/);
  await dismissCookieNoticeIfPresent(page);
  await expect(page.getByLabel("Username")).toBeVisible();
  await expect(page.getByLabel(/^Password$/)).toBeVisible();
  await expect(page.getByLabel("Confirm Password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create Account" })).toBeVisible();

  await page.getByLabel("Username").fill(username);
  await page.getByLabel(/^Password$/).fill(password);
  await page.getByLabel("Confirm Password").fill(password);
  await page.getByRole("checkbox", { name: /I agree to the/i }).click();
  await page.getByRole("button", { name: "Create Account" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);

  const loginResponse = await request.post("http://127.0.0.1:8080/auth/user/login", {
    data: {
      username,
      password,
      deviceFingerprint: "playwright-smoke",
    },
  });
  expect(loginResponse.ok()).toBeTruthy();
  const authUser = (await loginResponse.json()) as {
    accessToken: string;
  };

  const authHeaders = {
    Authorization: `Bearer ${authUser.accessToken}`,
  };

  const workoutResponse = await request.post("http://127.0.0.1:8080/workout/workout-templates", {
    headers: authHeaders,
    data: {
      name: "Smoke Push",
      category: "Push",
      exercises: [{ exerciseName: "Bench Press", goalSets: 3, variant: "Barbell" }],
    },
  });
  expect(workoutResponse.ok()).toBeTruthy();
  const workout = await workoutResponse.json();

  const splitResponse = await request.post("http://127.0.0.1:8080/workout/splits", {
    headers: authHeaders,
    data: {
      name: "Smoke Split",
      workoutFrequencies: [
        {
          workoutTemplateId: workout.id,
          sessionsPerWeek: 1,
        },
      ],
    },
  });
  expect(splitResponse.ok()).toBeTruthy();
  const split = await splitResponse.json();

  const entryPayload = {
    workoutTemplateId: workout.id,
    exercises: [
      {
        exerciseName: "Bench Press",
        variant: "Barbell",
        goalSets: 3,
        sets: [{ reps: 8, weight: 100, rpe: 8 }],
      },
    ],
  };

  await request.post("http://127.0.0.1:8080/workout/workout-entries", {
    headers: authHeaders,
    data: entryPayload,
  });
  await request.post("http://127.0.0.1:8080/workout/workout-entries", {
    headers: authHeaders,
    data: {
      ...entryPayload,
      exercises: [
        {
          ...entryPayload.exercises[0],
          sets: [{ reps: 8, weight: 105, rpe: 8.5 }],
        },
      ],
    },
  });

  await page.reload();

  await page.goto(`${baseURL}/workouts`);
  await expect(page.getByRole("link", { name: /^Smoke Push\b/ })).toBeVisible();

  await page.goto(`${baseURL}/periodisation?tab=splits`);
  await expect(page.getByText(split.name)).toBeVisible();

  await page.goto(`${baseURL}/insights`);
  await waitForInsightsPageReady(page);
  await page.goto(`${baseURL}/insights?tab=lift`);
  await waitForChartsLibraryReady(page);
});
