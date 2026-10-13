// Sends the magic-link email (slice 1, #8, design decision 8).
//
// Auth.js calls this every time someone asks for a sign-in or sign-up link
// (it's the Resend provider's `sendVerificationRequest` in src/auth.ts). We
// write our own instead of using Auth.js's built-in email for three reasons:
//   1. Wording: a short, plain message that says the link works once and
//      expires in 24 hours, instead of "Sign in to localhost:3000".
//   2. A retry: Resend limits how many emails we may send per second, and a
//      whole room tapping "Sign up" in the same minute is exactly that. If
//      Resend says "too many requests", we wait a second and try once more.
//   3. A test inbox: addresses ending in @collabz.test (the pretend students)
//      can never receive real email, so while the pretend cohort is on we
//      write their link to a file instead. The Playwright tests read it from
//      there to sign in for real.
//
// We talk to Resend with a single fetch() call, the same way Auth.js's own
// Resend provider does, rather than adding Resend's package as a dependency.
//
// Owner: slice 1 (#8).

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { isPretendCohortEnabled } from "@/lib/pretendCohort";

// Where the test inbox's files go: .magic-links/ in the project folder.
// It is gitignored, so links never end up in the repo.
export const TEST_INBOX_FOLDER = path.join(process.cwd(), ".magic-links");

// Pretend students' addresses end with this (foundation #7). ".test" is a
// domain reserved for testing that can never receive email.
const TEST_ADDRESS_ENDING = "@collabz.test";

const RESEND_URL = "https://api.resend.com/emails";
// HTTP's "Too Many Requests" status code.
const TOO_MANY_REQUESTS = 429;

export type MagicLinkEmail = {
  to: string;
  url: string;
  from: string | undefined;
  apiKey: string | undefined;
};

// Only for the tests: swap the parts that touch the outside world.
export type SendOptions = {
  fetchFunction?: typeof fetch;
  testInboxFolder?: string;
  retryAfterMs?: number;
};

export async function sendMagicLinkEmail(
  email: MagicLinkEmail,
  options: SendOptions = {},
): Promise<void> {
  const {
    fetchFunction = fetch,
    testInboxFolder = TEST_INBOX_FOLDER,
    retryAfterMs = 1000,
  } = options;

  if (shouldUseTestInbox(email.to)) {
    await saveToTestInbox(email, testInboxFolder);
    return;
  }

  const sendOnce = () =>
    fetchFunction(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${email.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: email.from,
        to: email.to,
        subject: "Your Collabz sign-in link",
        text: plainText(email.url),
        html: simpleHtml(email.url),
      }),
    });

  let response = await sendOnce();

  if (response.status === TOO_MANY_REQUESTS) {
    await wait(retryAfterMs);
    response = await sendOnce();
  }

  if (!response.ok) {
    // Throwing tells Auth.js that sending failed. It then reports an error,
    // and the form shows "We couldn't send the email just now".
    // We include Resend's answer for whoever reads the server log, but never
    // the link itself, which would let anyone reading the log sign in.
    throw new Error(`Resend refused the email (status ${response.status}).`);
  }
}

// The test inbox is used only for pretend addresses, and only where the
// pretend cohort is on. So on production (where it's always off) every
// email really goes to Resend, even one ending in @collabz.test, and no
// file is ever written.
function shouldUseTestInbox(to: string): boolean {
  return isPretendCohortEnabled() && to.toLowerCase().endsWith(TEST_ADDRESS_ENDING);
}

// Writes the link to .magic-links/<email>.txt, replacing any older link for
// that address, so a test always reads the newest one.
async function saveToTestInbox(email: MagicLinkEmail, folder: string): Promise<void> {
  await mkdir(folder, { recursive: true });
  await writeFile(path.join(folder, `${email.to.toLowerCase()}.txt`), email.url, "utf8");
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function plainText(url: string): string {
  return [
    "Tap the link below to sign in to Collabz:",
    "",
    url,
    "",
    "It works once and expires in 24 hours.",
    "If you didn't ask for this, you can ignore this email.",
  ].join("\n");
}

// Kept very simple on purpose: plain HTML with no images or styling tricks,
// which spam filters treat more kindly.
function simpleHtml(url: string): string {
  return `<p>Tap the button below to sign in to Collabz.</p>
<p><a href="${url}" style="display:inline-block;padding:10px 16px;border:2px solid #111;border-radius:4px;color:#111;font-weight:bold;text-decoration:none">Sign in to Collabz</a></p>
<p>It works once and expires in 24 hours.<br>If you didn't ask for this, you can ignore this email.</p>`;
}
