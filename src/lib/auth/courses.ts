// The courses someone can choose when signing up (slice 1, #8).
//
// Courses are database rows (rule B2), and an admin can retire one later
// (slice 8). A retired course is never offered on the sign-up form, but
// people already on it keep it (user-auth spec: "Retired course not offered").
//
// Owner: slice 1 (#8).

import { prisma } from "@/lib/db";

export type CourseChoice = {
  id: string;
  name: string;
};

// Active courses, in the order the catalogue gives them.
export async function getActiveCourses(): Promise<CourseChoice[]> {
  return prisma.course.findMany({
    where: { retiredAt: null },
    orderBy: { order: "asc" },
    select: { id: true, name: true },
  });
}
