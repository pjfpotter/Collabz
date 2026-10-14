"use server";
// The Server Actions behind /admin/courses (slice 8, #15, design 1 and 10).
//
// EVERY action calls requireAdmin() as its first line. A Server Action is a
// public address that anyone can post to, so it can't rely on the page that
// showed the form having checked. requireAdmin() throws (a redirect for
// someone signed out, "not found" for a member), so nothing below it runs.
//
// After each change we send the admin back to the list. A problem travels in
// the address (?problem=...) so the page can show it without any client-side
// state (design 10).

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  addCourse,
  moveCourse,
  renameCourse,
  setCourseRetired,
  type MoveDirection,
} from "@/lib/admin/courses";
import { requireAdmin } from "@/lib/currentUser";

const COURSES_PAGE = "/admin/courses";

// Shows the problem, or refreshes the pages that list courses and goes back.
// redirect() works by throwing, so this function never returns.
function finish(problems: string[]): never {
  if (problems.length > 0) {
    redirect(`${COURSES_PAGE}?problem=${encodeURIComponent(problems[0])}`);
  }
  // The admin list, and the sign-up form that offers the courses.
  revalidatePath(COURSES_PAGE);
  revalidatePath("/signup");
  redirect(COURSES_PAGE);
}

export async function addCourseAction(formData: FormData): Promise<void> {
  await requireAdmin();
  finish(await addCourse(String(formData.get("name") ?? "")));
}

export async function renameCourseAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  finish(await renameCourse(id, String(formData.get("name") ?? "")));
}

export async function moveCourseAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  // Only the two known words are accepted; anything else is treated as "down"
  // safely by being refused here.
  const direction = String(formData.get("direction") ?? "");
  if (direction !== "up" && direction !== "down") {
    finish(["That isn't a direction."]);
  }
  finish(await moveCourse(id, direction as MoveDirection));
}

export async function setCourseRetiredAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const retired = formData.get("retired") === "true";
  finish(await setCourseRetired(id, retired));
}
