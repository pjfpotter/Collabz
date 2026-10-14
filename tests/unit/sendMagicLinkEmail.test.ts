// Tests for sending the magic-link email (slice 1, #8, tasks 3.5 and 7.3).
//
// The most important rule here: on production a magic link is ALWAYS
// emailed and never written to a file, even for an @collabz.test address.
// A link in a file is a way to sign in as that person.
//
// Gmail (in use) is tested with a fake mail transport, and Resend (switched
// off but kept ready) with a fake fetch, so no real email is ever sent. The
// test inbox goes in a temporary folder, never the project's .magic-links/.

import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  gmailServer,
  sendViaGmail,
  sendViaResend,
  type MagicLinkEmail,
  type MailTransport,
} from "@/lib/auth/sendMagicLinkEmail";

const pretendEmail: MagicLinkEmail = {
  to: "pretend-02@collabz.test",
  url: "http://localhost:3000/api/auth/callback/nodemailer?token=abc",
  from: "Collabz <collabz.signin@example.test>",
};

const realEmail: MagicLinkEmail = { ...pretendEmail, to: "student@example.com" };

const gmailAccount = { user: "collabz.signin@example.test", appPassword: "abcdabcdabcdabcd" };

let inbox: string;

beforeEach(async () => {
  // A fresh, empty folder for each test.
  inbox = await mkdtemp(path.join(tmpdir(), "collabz-inbox-"));
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(inbox, { recursive: true, force: true });
});

// Switches the pretend cohort on (a laptop or a preview) or off (production).
function pretendCohort(on: boolean) {
  vi.stubEnv("PRETEND_COHORT", on ? "on" : undefined);
  vi.stubEnv("VERCEL_ENV", undefined);
}

// ---------------------------------------------------------------------------
// Gmail (in use)
// ---------------------------------------------------------------------------

// A fake Gmail. Each call either succeeds, or fails with the SMTP code given
// (e.g. 421), in the order listed. It remembers every message it was handed.
function fakeGmail(...outcomes: Array<"ok" | number>) {
  const sendMail = vi.fn(async () => {
    const outcome = outcomes.shift() ?? "ok";
    if (outcome === "ok") {
      return { rejected: [], pending: [] };
    }
    throw Object.assign(new Error(`SMTP failure, message had ${pretendEmail.url}`), {
      responseCode: outcome,
    });
  });
  const transport: MailTransport = { sendMail };
  return { transport, sendMail };
}

describe("sendViaGmail", () => {
  it("writes a pretend student's link to the test inbox while the cohort is on", async () => {
    pretendCohort(true);
    const gmail = fakeGmail();

    await sendViaGmail(pretendEmail, gmailAccount, { transport: gmail.transport, testInboxFolder: inbox });

    expect(gmail.sendMail).not.toHaveBeenCalled();
    const saved = await readFile(path.join(inbox, "pretend-02@collabz.test.txt"), "utf8");
    expect(saved).toBe(pretendEmail.url);
  });

  it("emails even an @collabz.test address on production, and writes no file", async () => {
    pretendCohort(false);
    const gmail = fakeGmail("ok");

    await sendViaGmail(pretendEmail, gmailAccount, { transport: gmail.transport, testInboxFolder: inbox });

    expect(gmail.sendMail).toHaveBeenCalledTimes(1);
    expect(await readdir(inbox)).toEqual([]);
  });

  it("sends a real address once, from our sender, with the link and our wording", async () => {
    pretendCohort(true);
    const gmail = fakeGmail("ok");

    await sendViaGmail(realEmail, gmailAccount, { transport: gmail.transport, testInboxFolder: inbox });

    expect(gmail.sendMail).toHaveBeenCalledTimes(1);
    const message = (gmail.sendMail.mock.calls[0] as unknown as [Record<string, string>])[0];
    expect(message.to).toBe(realEmail.to);
    expect(message.from).toBe(realEmail.from);
    expect(message.subject).toBe("Your Collabz sign-in link");
    expect(message.text).toContain(realEmail.url);
    expect(message.text).toContain("expires in 24 hours");
    expect(await readdir(inbox)).toEqual([]);
  });

  it("tries once more after a temporary failure (SMTP 421)", async () => {
    pretendCohort(false);
    const gmail = fakeGmail(421, "ok");

    await sendViaGmail(realEmail, gmailAccount, {
      transport: gmail.transport,
      testInboxFolder: inbox,
      retryAfterMs: 0,
    });

    expect(gmail.sendMail).toHaveBeenCalledTimes(2);
  });

  it("gives up with an error if the second try fails too", async () => {
    pretendCohort(false);
    const gmail = fakeGmail(454, 454);

    await expect(
      sendViaGmail(realEmail, gmailAccount, { transport: gmail.transport, testInboxFolder: inbox, retryAfterMs: 0 }),
    ).rejects.toThrow("SMTP 454");
    expect(gmail.sendMail).toHaveBeenCalledTimes(2);
  });

  it("doesn't retry a final refusal (SMTP 550)", async () => {
    pretendCohort(false);
    const gmail = fakeGmail(550);

    await expect(
      sendViaGmail(realEmail, gmailAccount, { transport: gmail.transport, testInboxFolder: inbox, retryAfterMs: 0 }),
    ).rejects.toThrow("SMTP 550");
    expect(gmail.sendMail).toHaveBeenCalledTimes(1);
  });

  it("fails when Gmail accepts the connection but refuses the address", async () => {
    pretendCohort(false);
    const sendMail = vi.fn(async () => ({ rejected: [realEmail.to], pending: [] }));

    await expect(
      sendViaGmail(realEmail, gmailAccount, { transport: { sendMail }, testInboxFolder: inbox }),
    ).rejects.toThrow("Gmail refused the email");
  });

  // The fake's own error message contains the link, as a real one might.
  // A link in the server log would let anyone reading the log sign in.
  it("never puts the link in the error it throws", async () => {
    pretendCohort(false);
    const gmail = fakeGmail(550);

    await expect(
      sendViaGmail(realEmail, gmailAccount, { transport: gmail.transport, testInboxFolder: inbox }),
    ).rejects.not.toThrow("token=");
  });

  it("connects to Gmail's server, encrypted, with the account and app password", () => {
    expect(gmailServer(gmailAccount)).toEqual({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: gmailAccount.user, pass: gmailAccount.appPassword },
    });
  });
});

// ---------------------------------------------------------------------------
// Resend (switched off, kept ready)
// ---------------------------------------------------------------------------

// A fake fetch that answers with the given status codes, one per call, and
// remembers every call.
function fakeFetch(...statuses: number[]) {
  return vi.fn(async () => new Response("{}", { status: statuses.shift() ?? 200 }));
}

const apiKey = "re_test_key";

describe("sendViaResend", () => {
  it("writes a pretend student's link to the test inbox while the cohort is on", async () => {
    pretendCohort(true);
    const fetchFunction = fakeFetch();

    await sendViaResend(pretendEmail, apiKey, { fetchFunction, testInboxFolder: inbox });

    expect(fetchFunction).not.toHaveBeenCalled();
    const saved = await readFile(path.join(inbox, "pretend-02@collabz.test.txt"), "utf8");
    expect(saved).toBe(pretendEmail.url);
  });

  it("still emails a real address while the cohort is on", async () => {
    pretendCohort(true);
    const fetchFunction = fakeFetch(200);

    await sendViaResend(realEmail, apiKey, { fetchFunction, testInboxFolder: inbox });

    expect(fetchFunction).toHaveBeenCalledTimes(1);
    expect(await readdir(inbox)).toEqual([]);
  });

  it("emails even an @collabz.test address on production, and writes no file", async () => {
    pretendCohort(false);
    const fetchFunction = fakeFetch(200);

    await sendViaResend(pretendEmail, apiKey, { fetchFunction, testInboxFolder: inbox });

    expect(fetchFunction).toHaveBeenCalledTimes(1);
    expect(await readdir(inbox)).toEqual([]);
  });

  // Belt and braces: VERCEL_ENV=production switches the cohort off even
  // if PRETEND_COHORT were set there by mistake.
  it("writes no file on the production deployment even if the cohort is switched on", async () => {
    vi.stubEnv("PRETEND_COHORT", "on");
    vi.stubEnv("VERCEL_ENV", "production");
    const fetchFunction = fakeFetch(200);

    await sendViaResend(pretendEmail, apiKey, { fetchFunction, testInboxFolder: inbox });

    expect(fetchFunction).toHaveBeenCalledTimes(1);
    expect(await readdir(inbox)).toEqual([]);
  });

  it("sends to Resend with our sender, the address, the link and the API key", async () => {
    pretendCohort(false);
    const fetchFunction = fakeFetch(200);

    await sendViaResend(realEmail, apiKey, { fetchFunction, testInboxFolder: inbox });

    const [url, request] = fetchFunction.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((request.headers as Record<string, string>).Authorization).toBe(`Bearer ${apiKey}`);
    const body = JSON.parse(String(request.body));
    expect(body.from).toBe(realEmail.from);
    expect(body.to).toBe(realEmail.to);
    expect(body.text).toContain(realEmail.url);
    expect(body.text).toContain("expires in 24 hours");
  });

  it("tries once more when Resend says too many requests (429)", async () => {
    pretendCohort(false);
    const fetchFunction = fakeFetch(429, 200);

    await sendViaResend(realEmail, apiKey, { fetchFunction, testInboxFolder: inbox, retryAfterMs: 0 });

    expect(fetchFunction).toHaveBeenCalledTimes(2);
  });

  it("gives up with an error if Resend is still busy the second time", async () => {
    pretendCohort(false);
    const fetchFunction = fakeFetch(429, 429);

    await expect(
      sendViaResend(realEmail, apiKey, { fetchFunction, testInboxFolder: inbox, retryAfterMs: 0 }),
    ).rejects.toThrow("status 429");
    expect(fetchFunction).toHaveBeenCalledTimes(2);
  });

  it("fails without retrying when Resend refuses for another reason", async () => {
    pretendCohort(false);
    const fetchFunction = fakeFetch(403);

    await expect(
      sendViaResend(realEmail, apiKey, { fetchFunction, testInboxFolder: inbox, retryAfterMs: 0 }),
    ).rejects.toThrow("status 403");
    expect(fetchFunction).toHaveBeenCalledTimes(1);
  });

  it("never puts the link in the error message", async () => {
    pretendCohort(false);
    const fetchFunction = fakeFetch(500);

    await expect(
      sendViaResend(realEmail, apiKey, { fetchFunction, testInboxFolder: inbox }),
    ).rejects.not.toThrow("token=");
  });
});
