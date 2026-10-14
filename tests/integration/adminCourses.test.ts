// Tests for the admin course functions (slice 8, #15, task 1.2) against the
// real test database.

import { afterAll, beforeEach, describe, expect, it } from "vitest";

import {
  addCourse,
  moveCourse,
  renameCourse,
  setCourseRetired,
} from "@/lib/admin/courses";
import { getActiveCourses } from "@/lib/auth/courses";
import { prisma } from "@/lib/db";

import { seedCatalogue } from "../../prisma/seed";
import { emptyDatabase } from "../helpers/database";

// The seed gives two courses: Software (order 1) and Business (order 2).
beforeEach(async () => {
  await emptyDatabase(prisma);
  await seedCatalogue(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function courseIdsInOrder(): Promise<string[]> {
  const courses = await prisma.course.findMany({ orderBy: { order: "asc" } });
  return courses.map((course) => course.id);
}

describe("addCourse", () => {
  it("adds a course last, with an id made from its name", async () => {
    expect(await addCourse("  Data Science ")).toEqual([]);

    const course = await prisma.course.findUniqueOrThrow({ where: { id: "data-science" } });
    expect(course.name).toBe("Data Science");
    expect(course.order).toBe(3);
    expect(course.retiredAt).toBeNull();
  });

  it("refuses an empty name", async () => {
    expect(await addCourse("   ")).toHaveLength(1);
    expect(await prisma.course.count()).toBe(2);
  });

  it("refuses a name that makes the same id as an existing course", async () => {
    expect(await addCourse("software")).toHaveLength(1);
    expect(await prisma.course.count()).toBe(2);
  });

  it("refuses a name with no letters or numbers", async () => {
    expect(await addCourse("!!!")).toHaveLength(1);
    expect(await prisma.course.count()).toBe(2);
  });
});

describe("renameCourse", () => {
  it("changes the name but keeps the id and the people on the course", async () => {
    const user = await prisma.user.create({
      data: { email: "a@example.com", courseId: "software" },
    });

    expect(await renameCourse("software", "Software Engineering")).toEqual([]);

    const course = await prisma.course.findUniqueOrThrow({ where: { id: "software" } });
    expect(course.name).toBe("Software Engineering");
    const reloaded = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(reloaded.courseId).toBe("software");
  });

  it("refuses a name another course already has, ignoring capitals", async () => {
    expect(await renameCourse("software", "business")).toHaveLength(1);
    const course = await prisma.course.findUniqueOrThrow({ where: { id: "software" } });
    expect(course.name).toBe("Software");
  });

  it("refuses a course that doesn't exist", async () => {
    expect(await renameCourse("nope", "Anything")).toHaveLength(1);
  });
});

describe("setCourseRetired", () => {
  it("hides a retired course from sign-up while its people keep it", async () => {
    const user = await prisma.user.create({
      data: { email: "a@example.com", courseId: "software" },
    });

    expect(await setCourseRetired("software", true)).toEqual([]);

    const offered = await getActiveCourses();
    expect(offered.map((course) => course.id)).toEqual(["business"]);
    const reloaded = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(reloaded.courseId).toBe("software");
  });

  it("brings a course back when un-retired", async () => {
    await setCourseRetired("software", true);
    expect(await setCourseRetired("software", false)).toEqual([]);

    const offered = await getActiveCourses();
    expect(offered.map((course) => course.id)).toEqual(["software", "business"]);
  });
});

describe("moveCourse", () => {
  it("swaps places with the neighbour", async () => {
    expect(await moveCourse("business", "up")).toEqual([]);
    expect(await courseIdsInOrder()).toEqual(["business", "software"]);

    expect(await moveCourse("business", "down")).toEqual([]);
    expect(await courseIdsInOrder()).toEqual(["software", "business"]);
  });

  it("says so when there is nowhere to move", async () => {
    expect(await moveCourse("software", "up")).toHaveLength(1);
    expect(await moveCourse("business", "down")).toHaveLength(1);
    expect(await courseIdsInOrder()).toEqual(["software", "business"]);
  });
});
