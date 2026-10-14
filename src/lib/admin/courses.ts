// Admin changes to the course list (slice 8, #15, design 2, 3, 4, 5).
//
// Every function here returns a list of PROBLEMS in plain English. An empty
// list means "it worked". The pages show the first problem next to the form.
// Why not throw: a bad name isn't a crash, it's something to tell the admin.
//
// Courses are never deleted (rule B2). They are retired, which hides them
// from the sign-up form while people already on them keep them.
//
// These functions don't check who is calling. The Server Actions in
// src/app/admin/courses/actions.ts do that first, with requireAdmin().
//
// Owner: slice 8 (#15).

import { prisma } from "@/lib/db";

import { slugify } from "./slugify";

export type MoveDirection = "up" | "down";

const NAME_REQUIRED = "Please type a name.";

// Adds a course at the end of the list.
export async function addCourse(rawName: string): Promise<string[]> {
  const name = rawName.trim();
  if (name === "") {
    return [NAME_REQUIRED];
  }

  // The id is made once from the name and never changes (design 3).
  const id = slugify(name);
  if (id === null) {
    return ["Please use a name with at least one letter or number."];
  }

  // Refuse a clash instead of adding "-2" to the id, so ids stay readable.
  const existing = await prisma.course.findUnique({ where: { id } });
  if (existing) {
    return [`A course called "${existing.name}" already exists.`];
  }

  // The new course goes last: one more than the highest position now.
  const last = await prisma.course.findFirst({ orderBy: { order: "desc" } });
  const order = (last?.order ?? 0) + 1;

  await prisma.course.create({ data: { id, name, order } });
  return [];
}

// Changes the name shown to people. The id and everyone on the course stay.
export async function renameCourse(id: string, rawName: string): Promise<string[]> {
  const name = rawName.trim();
  if (name === "") {
    return [NAME_REQUIRED];
  }

  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) {
    return ["That course doesn't exist."];
  }

  // Two courses with the same name would look identical on the sign-up form.
  const sameName = await prisma.course.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, id: { not: id } },
  });
  if (sameName) {
    return [`A course called "${sameName.name}" already exists.`];
  }

  await prisma.course.update({ where: { id }, data: { name } });
  return [];
}

// Moves a course one place up or down by swapping its `order` with the
// neighbour's (design 5). Retired courses count as neighbours too, so the
// admin sees the same list they are moving within.
export async function moveCourse(id: string, direction: MoveDirection): Promise<string[]> {
  const courses = await prisma.course.findMany({
    orderBy: [{ order: "asc" }, { id: "asc" }],
  });

  const index = courses.findIndex((course) => course.id === id);
  if (index === -1) {
    return ["That course doesn't exist."];
  }

  const neighbourIndex = direction === "up" ? index - 1 : index + 1;
  const neighbour = courses[neighbourIndex];
  if (!neighbour) {
    return [direction === "up" ? "It is already first." : "It is already last."];
  }

  const course = courses[index];

  // Two updates in one transaction: either both positions change or neither,
  // so we can never be left with two courses in the same place.
  await prisma.$transaction([
    prisma.course.update({ where: { id: course.id }, data: { order: neighbour.order } }),
    prisma.course.update({ where: { id: neighbour.id }, data: { order: course.order } }),
  ]);
  return [];
}

// Retires (retired = true) or un-retires a course. Setting a date, not
// deleting, so users and scores keep pointing at a real row (design 4).
export async function setCourseRetired(id: string, retired: boolean): Promise<string[]> {
  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) {
    return ["That course doesn't exist."];
  }

  await prisma.course.update({
    where: { id },
    data: { retiredAt: retired ? new Date() : null },
  });
  return [];
}
