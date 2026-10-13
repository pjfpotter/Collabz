// Tests for sendMagicLinkEmail (slice 1, #8, task 3.5).
//
// The most important rule here: on production a magic link is ALWAYS
// emailed and never written to a file, even for an @collabz.test address.
// A link in a file is a way to sign in as that person.
//
// fetch is replaced by a fake, so no real email is ever sent, and the test
// inbox goes in a temporary folder, never the project's .magic-links/.

import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sendMagicLinkEmail, type MagicLinkEmail } from "@/lib/auth/sendMagicLinkEmail";

const pretendEmail: MagicLinkEmail = {
  to: "pretend-02@collabz.test",
  url: "http://localhost:3000/api/auth/callback/resend?token=abc",
  from: "Collabz <login@example.test>",
  apiKey: "re_test_key",
};

const realEmail: MagicLinkEmail = { ...pretendEmail, to: "student@example.com" };

// A fake fetch that answers with the given status codes, one per call, and
// remembers every call.
function fakeFetch(...statuses: number[]) {
  return vi.fn(async () => new Response("{}", { status: statuses.shift() ?? 200 }));
}

let inbox: string;

beforeEach(async () => {
  // A fresh, empty folder for each test.
  inbox = await mkdtemp(path.join(tmpdir(), "collabz-inbox-"));
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(inbox, { recursive: true, force: true });
});

describe("sendMagicLinkEmail", () => {
  describe("with the pretend cohort ON (a laptop or a preview)", () => {
    beforeEach(() => {
      vi.stubEnv("PRETEND_COHORT", "on");
      vi.stubEnv("VERCEL_ENV", undefined);
    });

    it("writes a pretend student's link to the test inbox instead of emailing it", async () => {
      const fetchFunction = fakeFetch();

      await sendMagicLinkEmail(pretendEmail, { fetchFunction, testInboxFolder: inbox });

      expect(fetchFunction).not.toHaveBeenCalled();
      const saved = await readFile(path.join(inbox, "pretend-02@collabz.test.txt"), "utf8");
      expect(saved).toBe(pretendEmail.url);
    });

    it("still emails a real address", async () => {
      const fetchFunction = fakeFetch(200);

      await sendMagicLinkEmail(realEmail, { fetchFunction, testInboxFolder: inbox });

      expect(fetchFunction).toHaveBeenCalledTimes(1);
      expect(await readdir(inbox)).toEqual([]);
    });
  });

  describe("with the pretend cohort OFF (production)", () => {
    beforeEach(() => {
      vi.stubEnv("PRETEND_COHORT", undefined);
    });

    it("emails even an @collabz.test address and writes no file", async () => {
      const fetchFunction = fakeFetch(200);

      await sendMagicLinkEmail(pretendEmail, { fetchFunction, testInboxFolder: inbox });

      expect(fetchFunction).toHaveBeenCalledTimes(1);
      expect(await readdir(inbox)).toEqual([]);
    });

    // Belt and braces: VERCEL_ENV=production switches the cohort off even
    // if PRETEND_COHORT were set there by mistake.
    it("writes no file on the production deployment even if the cohort is switched on", async () => {
      vi.stubEnv("PRETEND_COHORT", "on");
      vi.stubEnv("VERCEL_ENV", "production");
      const fetchFunction = fakeFetch(200);

      await sendMagicLinkEmail(pretendEmail, { fetchFunction, testInboxFolder: inbox });

      expect(fetchFunction).toHaveBeenCalledTimes(1);
      expect(await readdir(inbox)).toEqual([]);
    });

    it("sends to Resend with our sender, the address and the link", async () => {
      const fetchFunction = fakeFetch(200);

      await sendMagicLinkEmail(realEmail, { fetchFunction, testInboxFolder: inbox });

      const [url, request] = fetchFunction.mock.calls[0] as unknown as [string, RequestInit];
      expect(url).toBe("https://api.resend.com/emails");
      const body = JSON.parse(String(request.body));
      expect(body.from).toBe(realEmail.from);
      expect(body.to).toBe(realEmail.to);
      expect(body.text).toContain(realEmail.url);
      expect(body.text).toContain("expires in 24 hours");
    });

    it("tries once more when Resend says too many requests (429)", async () => {
      const fetchFunction = fakeFetch(429, 200);

      await sendMagicLinkEmail(realEmail, { fetchFunction, testInboxFolder: inbox, retryAfterMs: 0 });

      expect(fetchFunction).toHaveBeenCalledTimes(2);
    });

    it("gives up with an error if Resend is still busy the second time", async () => {
      const fetchFunction = fakeFetch(429, 429);

      await expect(
        sendMagicLinkEmail(realEmail, { fetchFunction, testInboxFolder: inbox, retryAfterMs: 0 }),
      ).rejects.toThrow("status 429");
      expect(fetchFunction).toHaveBeenCalledTimes(2);
    });

    it("fails without retrying when Resend refuses for another reason", async () => {
      const fetchFunction = fakeFetch(403);

      await expect(
        sendMagicLinkEmail(realEmail, { fetchFunction, testInboxFolder: inbox, retryAfterMs: 0 }),
      ).rejects.toThrow("status 403");
      expect(fetchFunction).toHaveBeenCalledTimes(1);
    });

    // A link in the server log would let anyone reading the log sign in.
    it("never puts the link in the error message", async () => {
      const fetchFunction = fakeFetch(500);

      await expect(
        sendMagicLinkEmail(realEmail, { fetchFunction, testInboxFolder: inbox }),
      ).rejects.not.toThrow("token=");
    });
  });
});
