"use server";
// The account page's Server Actions (slice 7, #14, design decision 5).
//
// Small forms with no files use Server Actions, as slice 1's forms do. (The
// photo is different: it's too big for one, see /api/account/photo.)

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { signOut } from "@/auth";
import { changeCourse } from "@/lib/account/course";
import { getCurrentUser } from "@/lib/currentUser";

// What the course form shows after each try. CourseForm.tsx reads it.
export type CourseFormState =
  | { step: "ready" }
  | { step: "saved" }
  | { step: "problem"; message: string };

export async function saveCourse(
  _previous: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  // Check again who is signed in: a Server Action can be called directly,
  // not only from our page.
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin");
  }

  const result = await changeCourse(user.id, String(formData.get("courseId") ?? ""));
  if (!result.ok) {
    return { step: "problem", message: result.problem };
  }

  // Draw /account again with the new course.
  revalidatePath("/account");
  return { step: "saved" };
}

// Sign out and go to the home page (slice 1's signOut).
export async function signOutFromAccount(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
