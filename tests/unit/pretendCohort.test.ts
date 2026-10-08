// Tests for the pretend cohort's on/off switch (foundation #7, task 2.1).
//
// This one small function is what keeps the "sign in as anyone" switcher and
// the pretend students off the live site, so every way it could be left on
// by mistake gets its own test.

import { afterEach, describe, expect, it, vi } from "vitest";

import { isPretendCohortEnabled } from "@/lib/pretendCohort";

describe("isPretendCohortEnabled", () => {
  afterEach(() => {
    // Put the environment variables back as they were, so one test's
    // settings never leak into the next.
    vi.unstubAllEnvs();
  });

  it("is off when PRETEND_COHORT is not set", () => {
    // Stubbing with undefined removes the variable for this test.
    vi.stubEnv("PRETEND_COHORT", undefined);
    vi.stubEnv("VERCEL_ENV", undefined);

    expect(isPretendCohortEnabled()).toBe(false);
  });

  it('is on when PRETEND_COHORT is "on" (a laptop: no VERCEL_ENV)', () => {
    vi.stubEnv("PRETEND_COHORT", "on");
    vi.stubEnv("VERCEL_ENV", undefined);

    expect(isPretendCohortEnabled()).toBe(true);
  });

  it("is on for a Vercel preview deploy", () => {
    vi.stubEnv("PRETEND_COHORT", "on");
    vi.stubEnv("VERCEL_ENV", "preview");
    // Vercel sets NODE_ENV to "production" on previews too. The switch must
    // not be fooled by that, or the switcher wouldn't work on previews.
    vi.stubEnv("NODE_ENV", "production");

    expect(isPretendCohortEnabled()).toBe(true);
  });

  it("is off on the production deployment even when switched on by mistake", () => {
    vi.stubEnv("PRETEND_COHORT", "on");
    vi.stubEnv("VERCEL_ENV", "production");

    expect(isPretendCohortEnabled()).toBe(false);
  });

  // Only the exact word "on" counts, so there is one spelling to search for.
  it.each(["true", "ON", "On", "1", "yes", " on", ""])(
    'is off when PRETEND_COHORT is "%s"',
    (value) => {
      vi.stubEnv("PRETEND_COHORT", value);
      vi.stubEnv("VERCEL_ENV", undefined);

      expect(isPretendCohortEnabled()).toBe(false);
    },
  );
});
