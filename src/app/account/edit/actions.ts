"use server";
// The edit screen's Server Action (slice 7, #14, design decisions 5 and 6).

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { saveCategoryEdit } from "@/lib/account/editAnswers";
import { getCurrentUser } from "@/lib/currentUser";

export type EditFormState = { problem: string | null };

export async function saveEdit(
  _previous: EditFormState,
  formData: FormData,
): Promise<EditFormState> {
  // Check again who is signed in: a Server Action can be called directly.
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin");
  }

  const categoryId = String(formData.get("categoryId") ?? "");
  // Each picked tag is sent as its own "picks" field (PickStepStandIn).
  const picks = formData.getAll("picks").map(String);

  const result = await saveCategoryEdit(user.id, categoryId, picks);
  if (!result.ok) {
    return { problem: result.problem };
  }

  // Back to the account page, drawn fresh with the new picks and bio.
  revalidatePath("/account");
  redirect("/account");
}
