// What every admin Server Action does at the end (slice 8, #15, design 10):
// show the first problem, or refresh the pages that list the changed data and
// go back to the admin page.
//
// This is a plain module, NOT a "use server" file, because "use server" files
// may only export Server Actions.
//
// redirect() works by throwing, so this function never returns.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export function redirectBack(
  adminPage: string,
  pagesToRefresh: string[],
  problems: string[],
  note?: string,
): never {
  if (problems.length > 0) {
    // The problem travels in the address so the page can show it without any
    // client-side state.
    redirect(`${adminPage}?problem=${encodeURIComponent(problems[0])}`);
  }

  revalidatePath(adminPage);
  for (const page of pagesToRefresh) {
    revalidatePath(page);
  }

  if (note) {
    redirect(`${adminPage}?note=${encodeURIComponent(note)}`);
  }
  redirect(adminPage);
}
