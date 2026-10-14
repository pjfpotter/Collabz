// Tests for changeCourse (slice 7, #14, task 3.1).
// Spec scenarios: "Change course" and "Only active courses offered".

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { changeCourse } from "@/lib/account/course";
import { prisma } from "@/lib/db";

import { seedCatalogue } from "../../prisma/seed";
import { emptyDatabase } from "../helpers/database";
import { createPerson, createScore } from "../helpers/people";

let student: string;

async function courseOf(userId: string) {
  return (await prisma.user.findUniqueOrThrow({ where: { id: userId } })).courseId;
}

beforeEach(async () => {
  await emptyDatabase(prisma);
  // The real courses: "software" and "business".
  await seedCatalogue(prisma);
  student = await createPerson(prisma, "student", { courseId: "software" });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("changeCourse", () => {
  it("saves an active course", async () => {
    expect(await changeCourse(student, "business")).toEqual({ ok: true });
    expect(await courseOf(student)).toBe("business");
  });

  it("refuses a retired course and changes nothing", async () => {
    await prisma.course.create({
      data: { id: "design", name: "Design", order: 99, retiredAt: new Date() },
    });

    const result = await changeCourse(student, "design");

    expect(result.ok).toBe(false);
    expect(await courseOf(student)).toBe("software");
  });

  it("refuses a course that doesn't exist, or no choice at all", async () => {
    expect((await changeCourse(student, "made-up")).ok).toBe(false);
    expect((await changeCourse(student, "")).ok).toBe(false);
    expect(await courseOf(student)).toBe("software");
  });

  // Spec: "nobody's scores change (course isn't scored)".
  it("leaves every score as it was", async () => {
    const other = await createPerson(prisma, "other");
    await createScore(prisma, student, other, 7);
    const before = await prisma.edge.findMany();

    await changeCourse(student, "business");

    expect(await prisma.edge.findMany()).toEqual(before);
  });
});
