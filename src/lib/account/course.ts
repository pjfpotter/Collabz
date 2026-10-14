// Changing your course from the account page (slice 7, #14, design
// decision 5).
//
// Only a course that is currently offered can be chosen (account-management
// spec: "Only active courses offered"). Retired courses stay on the people
// who already have them, but nobody can switch TO one.
//
// No rescore: course is shown and filterable, but never part of the score
// (chemistry-matching: "Skills, Interests and course SHALL NOT affect the
// score"), so calling scoreUser would only cost time.
//
// Owner: slice 7 (#14).

import { getActiveCourses } from "@/lib/auth/courses";
import { prisma } from "@/lib/db";

export type ChangeCourseResult = { ok: true } | { ok: false; problem: string };

export async function changeCourse(
  userId: string,
  courseId: string,
): Promise<ChangeCourseResult> {
  const activeCourses = await getActiveCourses();
  const isOffered = activeCourses.some((course) => course.id === courseId);
  if (!isOffered) {
    // A retired course, an empty choice, or an id typed by hand.
    return { ok: false, problem: "Choose one of the courses in the list." };
  }

  await prisma.user.update({ where: { id: userId }, data: { courseId } });
  return { ok: true };
}
