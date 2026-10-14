// Tests for the two sign-in rules Auth.js runs for us (slice 1, #8, task 3.2):
// suspended accounts are refused, and emails on ADMIN_EMAILS become admins
// when their account is created.
//
// The full magic-link journey (with Auth.js calling these for real) is
// covered by the Playwright tests in tests/e2e/signin.spec.ts.

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { applyAdminList, mayFinishSignIn } from "@/lib/auth/signInRules";
import { prisma } from "@/lib/db";

import { emptyDatabase } from "../helpers/database";

beforeEach(async () => {
  await emptyDatabase(prisma);
});

afterAll(async () => {
  // No restoring here: tests/helpers/restoreDevData.ts puts the database
  // back once, after the whole test run.
  await prisma.$disconnect();
});

describe("mayFinishSignIn", () => {
  it("lets a member who isn't suspended sign in", async () => {
    await prisma.user.create({ data: { email: "member@example.test" } });

    expect(await mayFinishSignIn("member@example.test")).toBe(true);
  });

  it("refuses a suspended user (spec: Suspended user tries to sign in)", async () => {
    await prisma.user.create({
      data: { email: "suspended@example.test", suspendedAt: new Date() },
    });

    expect(await mayFinishSignIn("suspended@example.test")).toBe(false);
  });

  // Their row doesn't exist until Auth.js creates it, after this check.
  it("lets someone signing in for the first time through", async () => {
    expect(await mayFinishSignIn("brand-new@example.test")).toBe(true);
  });
});

describe("applyAdminList", () => {
  const adminList = "patrick@example.test, Tom@Example.test";

  it("makes a listed email an admin (spec: Listed email becomes admin)", async () => {
    const user = await prisma.user.create({ data: { email: "tom@example.test" } });

    await applyAdminList(user, adminList);

    const saved = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(saved.role).toBe("ADMIN");
  });

  it("leaves an unlisted email a member (spec: Unlisted email becomes member)", async () => {
    const user = await prisma.user.create({ data: { email: "student@example.test" } });

    await applyAdminList(user, adminList);

    const saved = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(saved.role).toBe("MEMBER");
  });

  it("leaves everyone a member when ADMIN_EMAILS isn't set", async () => {
    const user = await prisma.user.create({ data: { email: "tom@example.test" } });

    await applyAdminList(user, undefined);

    const saved = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(saved.role).toBe("MEMBER");
  });
});
