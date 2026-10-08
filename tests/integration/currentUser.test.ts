// Tests for findPretendUser (foundation #7, task 2.3): the rule that decides
// who the dev "sign in as…" switcher is allowed to turn you into.
//
// getCurrentUser() and requireAdmin() need a real browser request (they read
// a cookie and redirect), so those are covered by the Playwright tests in
// tests/e2e/switcher.spec.ts instead.

import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { findPretendUser } from "@/lib/currentUser";
import { prisma } from "@/lib/db";

import { emptyDatabase } from "../helpers/database";

describe("findPretendUser", () => {
  beforeEach(async () => {
    await emptyDatabase(prisma);

    // One pretend user and one "real" user (an id without the pretend
    // prefix, the kind slice 1's sign-up will create).
    await prisma.user.create({
      data: { id: "pretend-user-01", email: "pretend-01@collabz.test" },
    });
    await prisma.user.create({
      data: { id: "real-user-1", email: "someone@example.test" },
    });

    // Most tests want the pretend cohort switched on, as on a laptop.
    vi.stubEnv("PRETEND_COHORT", "on");
    vi.stubEnv("VERCEL_ENV", undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  afterAll(async () => {
    // No restoring here: tests/helpers/restoreDevData.ts puts the database
    // back once, after the whole test run.
    await prisma.$disconnect();
  });

  it("returns a pretend user by id", async () => {
    const user = await findPretendUser("pretend-user-01");

    expect(user?.email).toBe("pretend-01@collabz.test");
  });

  it("returns nobody for a real user's id, even though that user exists", async () => {
    // The switcher must never be a way to become a real person.
    expect(await findPretendUser("real-user-1")).toBeNull();
  });

  it("returns nobody for a pretend id that doesn't exist", async () => {
    expect(await findPretendUser("pretend-user-99")).toBeNull();
  });

  it("returns nobody when the pretend cohort is switched off", async () => {
    vi.stubEnv("PRETEND_COHORT", undefined);

    expect(await findPretendUser("pretend-user-01")).toBeNull();
  });

  it("returns nobody on the production deployment", async () => {
    vi.stubEnv("VERCEL_ENV", "production");

    expect(await findPretendUser("pretend-user-01")).toBeNull();
  });
});
