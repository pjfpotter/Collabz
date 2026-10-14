// Tests for completeSignUp, the last step of sign-up (slice 1, #8, task 4.2).
//
// Until it saves, an account counts as not created, so these check it only
// saves good answers. The answers arrive in a magic link that anyone could
// edit, which is why a made-up or retired course must be refused here too.

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { completeSignUp } from "@/lib/auth/completeSignUp";
import { prisma } from "@/lib/db";

import { seedCatalogue } from "../../prisma/seed";
import { emptyDatabase } from "../helpers/database";

// A user as Auth.js leaves them after opening the magic link: an email and
// nothing else.
async function makeUnfinishedUser() {
  return prisma.user.create({ data: { email: "new-student@example.test" } });
}

beforeEach(async () => {
  await emptyDatabase(prisma);
  // The real courses ("software", "business") from the catalogue seed.
  await seedCatalogue(prisma);
});

afterAll(async () => {
  // No restoring here: tests/helpers/restoreDevData.ts puts the database
  // back once, after the whole test run.
  await prisma.$disconnect();
});

describe("completeSignUp", () => {
  it("saves the course and when the terms were accepted", async () => {
    const user = await makeUnfinishedUser();
    const before = new Date();

    const problems = await completeSignUp(user, { courseId: "business", acceptedTerms: true });

    expect(problems).toEqual([]);
    const saved = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(saved.courseId).toBe("business");
    expect(saved.acceptedTermsAt).not.toBeNull();
    expect(saved.acceptedTermsAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it("refuses a retired course and saves nothing", async () => {
    await prisma.course.create({
      data: { id: "design", name: "Design", order: 99, retiredAt: new Date() },
    });
    const user = await makeUnfinishedUser();

    const problems = await completeSignUp(user, { courseId: "design", acceptedTerms: true });

    expect(problems.map((problem) => problem.field)).toEqual(["courseId"]);
    const saved = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(saved.courseId).toBeNull();
    expect(saved.acceptedTermsAt).toBeNull();
  });

  it("refuses a made-up course (an edited link) and saves nothing", async () => {
    const user = await makeUnfinishedUser();

    const problems = await completeSignUp(user, { courseId: "made-up", acceptedTerms: true });

    expect(problems.map((problem) => problem.field)).toEqual(["courseId"]);
    const saved = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(saved.courseId).toBeNull();
  });

  it("refuses when the terms aren't accepted, and saves nothing", async () => {
    const user = await makeUnfinishedUser();

    const problems = await completeSignUp(user, { courseId: "software", acceptedTerms: false });

    expect(problems.map((problem) => problem.field)).toEqual(["acceptedTerms"]);
    const saved = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(saved.courseId).toBeNull();
    expect(saved.acceptedTermsAt).toBeNull();
  });
});
