// Signs a Playwright browser in through the REAL magic-link flow (slice 1,
// #8), for pretend students' @collabz.test addresses:
//
//   const link = await requestMagicLink(page, "pretend-02@collabz.test");
//   await page.goto(link);
//
// While the pretend cohort is on, links for @collabz.test addresses aren't
// emailed: they're written to .magic-links/<email>.txt (see
// src/lib/auth/sendMagicLinkEmail.ts). These helpers read them from there.
//
// For most tests the dev switcher's signInAs() (devSignIn.ts) is quicker.
// Use these when the test is ABOUT signing in.

import { readFile, rm } from "node:fs/promises";
import path from "node:path";

import { expect, type Page } from "@playwright/test";

// Same folder as TEST_INBOX_FOLDER in sendMagicLinkEmail.ts. The test server
// runs from the project folder, and so do the tests.
const testInbox = path.join(process.cwd(), ".magic-links");

function inboxFile(email: string): string {
  return path.join(testInbox, `${email.toLowerCase()}.txt`);
}

// Fills in the email box on `formPage` (default /signin), presses the
// button, waits for "Check your email", and returns the link from the test
// inbox.
export async function requestMagicLink(
  page: Page,
  email: string,
  formPage = "/signin",
): Promise<string> {
  // Remove any older link first, so we can't read a stale one by mistake.
  await rm(inboxFile(email), { force: true });

  await page.goto(formPage);
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: /email me a sign-in link/i }).click();
  await expect(page.getByTestId("check-email")).toBeVisible();

  return readMagicLink(email);
}

// The newest link sent to `email`. Waits up to 5 seconds for the file,
// because the server writes it a moment after answering the form.
export async function readMagicLink(email: string): Promise<string> {
  let link = "";
  await expect
    .poll(
      async () => {
        link = await readFile(inboxFile(email), "utf8").catch(() => "");
        return link;
      },
      { timeout: 5_000 },
    )
    .not.toBe("");
  return link;
}
