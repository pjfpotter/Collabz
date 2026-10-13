// Sends the magic-link email (slice 1, #8, design decisions 8 and 13).
//
// Auth.js calls one of these every time someone asks for a sign-in or
// sign-up link (as the email provider's `sendVerificationRequest`, see
// src/auth.ts). There are two ways to send, and src/auth.ts picks one:
//
//   - sendViaGmail()  IN USE. Sends through a dedicated Gmail account with an
//                     app password. Free, and needs no domain of our own
//                     (design decision 13, 13 Oct 2026).
//   - sendViaResend() SWITCHED OFF, kept ready. Resend delivers more reliably,
//                     but only to anyone once we have a verified domain.
//                     Nothing calls it right now; its tests keep it working
//                     so switching back is safe (see src/auth.ts).
//
// Both share three things we wrote ourselves, instead of Auth.js's built-in
// email:
//   1. Wording: a short, plain message that says the link works once and
//      expires in 24 hours, instead of "Sign in to localhost:3000".
//   2. One retry: email services limit how fast we may send, and a whole
//      room tapping "Sign up" in the same minute is exactly that. If the
//      service says "try again later", we wait a second and try once more.
//   3. A test inbox: addresses ending in @collabz.test (the pretend students)
//      can never receive real email, so while the pretend cohort is on we
//      write their link to a file instead. The Playwright tests read it from
//      there to sign in for real.
//
// Owner: slice 1 (#8).

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { createTransport } from "nodemailer";

import { isPretendCohortEnabled } from "@/lib/pretendCohort";

// Where the test inbox's files go: .magic-links/ in the project folder.
// It is gitignored, so links never end up in the repo.
export const TEST_INBOX_FOLDER = path.join(process.cwd(), ".magic-links");

// Pretend students' addresses end with this (foundation #7). ".test" is a
// domain reserved for testing that can never receive email.
const TEST_ADDRESS_ENDING = "@collabz.test";

// The parts every magic-link email has, whichever service sends it.
export type MagicLinkEmail = {
  to: string;
  url: string;
  // e.g. "Collabz <collabz.signin@gmail.com>"
  from: string | undefined;
};

// Only for the tests: swap the parts that touch the outside world.
type CommonOptions = {
  testInboxFolder?: string;
  retryAfterMs?: number;
};

// ---------------------------------------------------------------------------
// Gmail (in use)
// ---------------------------------------------------------------------------

// The Gmail account to send from. `appPassword` is a Gmail "app password":
// a 16-letter password Google makes for one app, NOT the account's normal
// password (README: "Signing in").
export type GmailAccount = {
  user: string | undefined;
  appPassword: string | undefined;
};

// Gmail's mail server settings, for nodemailer (and Auth.js's Nodemailer
// provider, which insists on being given them).
// Port 465 with `secure: true` means the connection is encrypted from the
// start, which is what Google recommends.
export function gmailServer(account: GmailAccount) {
  return {
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: account.user, pass: account.appPassword },
  };
}

// The one thing we need from nodemailer: something that can send a message.
// The tests pass a fake one with the same shape.
export type MailTransport = {
  sendMail(message: {
    from: string | undefined;
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<{ rejected?: unknown[]; pending?: unknown[] }>;
};

export async function sendViaGmail(
  email: MagicLinkEmail,
  account: GmailAccount,
  options: CommonOptions & { transport?: MailTransport } = {},
): Promise<void> {
  const { testInboxFolder = TEST_INBOX_FOLDER, retryAfterMs = 1000 } = options;

  if (shouldUseTestInbox(email.to)) {
    await saveToTestInbox(email, testInboxFolder);
    return;
  }

  // Only connect to Gmail when there's a real email to send.
  const transport = options.transport ?? createTransport(gmailServer(account));
  const message = { from: email.from, to: email.to, ...emailContent(email.url) };

  try {
    await sendOnceThroughGmail(transport, message);
  } catch (error) {
    // SMTP answers starting with 4 (e.g. 421 "too many connections", 454
    // "try again later") mean "temporary, try again". Answers starting with
    // 5 (e.g. 550 "no such mailbox") are final, so retrying won't help.
    if (!isTemporaryMailError(error)) {
      throw safeGmailError(error);
    }
    await wait(retryAfterMs);
    try {
      await sendOnceThroughGmail(transport, message);
    } catch (secondError) {
      throw safeGmailError(secondError);
    }
  }
}

async function sendOnceThroughGmail(
  transport: MailTransport,
  message: Parameters<MailTransport["sendMail"]>[0],
): Promise<void> {
  const result = await transport.sendMail(message);
  // Gmail can accept the connection but still refuse the address.
  const notDelivered = [...(result.rejected ?? []), ...(result.pending ?? [])];
  if (notDelivered.length > 0) {
    throw new Error("Gmail did not accept the address.");
  }
}

// The SMTP answer code on a nodemailer error, e.g. 421, if there is one.
function smtpCode(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "responseCode" in error) {
    const code = (error as { responseCode?: unknown }).responseCode;
    return typeof code === "number" ? code : undefined;
  }
  return undefined;
}

function isTemporaryMailError(error: unknown): boolean {
  const code = smtpCode(error);
  return code !== undefined && code >= 400 && code < 500;
}

// A plain error for Auth.js and the server log. It never includes the
// message we tried to send, because that holds the link, and a link in a log
// would let anyone reading the log sign in.
function safeGmailError(error: unknown): Error {
  const code = smtpCode(error);
  return new Error(`Gmail refused the email (SMTP ${code ?? "error"}).`);
}

// ---------------------------------------------------------------------------
// Resend (switched off, kept ready: see src/auth.ts)
// ---------------------------------------------------------------------------

const RESEND_URL = "https://api.resend.com/emails";
// HTTP's "Too Many Requests" status code.
const TOO_MANY_REQUESTS = 429;

// We talk to Resend with a single fetch() call, the same way Auth.js's own
// Resend provider does, rather than adding Resend's package as a dependency.
export async function sendViaResend(
  email: MagicLinkEmail,
  apiKey: string | undefined,
  options: CommonOptions & { fetchFunction?: typeof fetch } = {},
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
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: email.from, to: email.to, ...emailContent(email.url) }),
    });

  let response = await sendOnce();

  if (response.status === TOO_MANY_REQUESTS) {
    await wait(retryAfterMs);
    response = await sendOnce();
  }

  if (!response.ok) {
    // Throwing tells Auth.js that sending failed. It then reports an error,
    // and the form shows "We couldn't send the email just now".
    // We give Resend's status for whoever reads the server log, but never
    // the link itself.
    throw new Error(`Resend refused the email (status ${response.status}).`);
  }
}

// ---------------------------------------------------------------------------
// Shared by both
// ---------------------------------------------------------------------------

// The test inbox is used only for pretend addresses, and only where the
// pretend cohort is on. So on production (where it's always off) every
// email really is sent, even one ending in @collabz.test, and no file is
// ever written.
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

// The subject and body, the same whichever service sends them.
function emailContent(url: string): { subject: string; text: string; html: string } {
  return {
    subject: "Your Collabz sign-in link",
    text: [
      "Tap the link below to sign in to Collabz:",
      "",
      url,
      "",
      "It works once and expires in 24 hours.",
      "If you didn't ask for this, you can ignore this email.",
    ].join("\n"),
    // Kept very simple on purpose: plain HTML with no images or styling
    // tricks, which spam filters treat more kindly.
    html: `<p>Tap the button below to sign in to Collabz.</p>
<p><a href="${url}" style="display:inline-block;padding:10px 16px;border:2px solid #111;border-radius:4px;color:#111;font-weight:bold;text-decoration:none">Sign in to Collabz</a></p>
<p>It works once and expires in 24 hours.<br>If you didn't ask for this, you can ignore this email.</p>`,
  };
}
