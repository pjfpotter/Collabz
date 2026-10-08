// Signs a Playwright browser in as a pretend user, through the dev
// "sign in as…" switcher in the nav bar. Every track's browser tests can use
// this until real sign-in (slice 1) replaces the switcher:
//
//   await signInAs(page, "pretend-user-02");
//
// The pretend cohort must be in the test database first (see
// loadPretendCohortForTests in tests/helpers/database.ts).

import { expect, type Page } from "@playwright/test";

// The id of the switcher's dropdown (src/components/DevUserSwitcher.tsx).
const switcher = "#dev-user-switcher";

// Pass a pretend user's id, or "" to sign out.
export async function signInAs(page: Page, pretendUserId: string): Promise<void> {
  // The switcher is on every page, but the browser has to be on SOME page of
  // the app first. A brand-new Playwright page starts on "about:blank".
  if (!page.url().startsWith("http")) {
    await page.goto("/");
  }

  await page.selectOption(switcher, pretendUserId);
  await page.getByRole("button", { name: "Switch" }).click();

  // Wait until the page has reloaded showing the new choice, so the test's
  // next step can't run while the browser is still switching.
  await expect(page.locator(switcher)).toHaveValue(pretendUserId);
}

export async function signOut(page: Page): Promise<void> {
  await signInAs(page, "");
}
