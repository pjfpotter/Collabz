"use server";
// The Server Actions behind the Block and Report buttons (slice 9, #16,
// design 4 and 9).
//
// WHO IS ACTING: always the signed-in person, read here with getCurrentUser().
// The form only says WHO IT IS ABOUT, by the person's address (the last part
// of their profile address, as everywhere else). The address is turned into a
// user on the server, so a forged form can't make someone else block or
// report. A Server Action is a public address, so everything is checked here.
//
// The answer is { ok, message } and the buttons show the message in words,
// the same style as the Connect button.

import { revalidatePath } from "next/cache";

import { findPersonByAddress } from "@/lib/cohort/aliasAddress";
import { getVisiblePeople } from "@/lib/cohort/visiblePeople";
import { getCurrentUser } from "@/lib/currentUser";
import { isUserVisible } from "@/lib/requests/pairRules";
import { blockUser } from "@/lib/safety/blockUser";
import { reportUser } from "@/lib/safety/reportUser";

export type SafetyAnswer = { ok: boolean; message: string };

// Works out who is acting and who it is about, or why it can't be done.
async function whoIsInvolved(
  address: string,
): Promise<{ actorId: string; otherId: string } | { refusal: string }> {
  const viewer = await getCurrentUser();
  // Same as the pages: you need a finished profile (isUserVisible says so)
  // before you can do anything to anyone.
  if (!viewer || !(await isUserVisible(viewer.id))) {
    return { refusal: "Please sign in and finish your profile first." };
  }

  const person = findPersonByAddress(await getVisiblePeople(), address);
  if (!person) {
    return { refusal: "Nobody lives at that address." };
  }
  return { actorId: viewer.id, otherId: person.userId };
}

export async function blockPersonAction(address: string): Promise<SafetyAnswer> {
  const who = await whoIsInvolved(String(address));
  if ("refusal" in who) {
    return { ok: false, message: who.refusal };
  }

  const problems = await blockUser(who.actorId, who.otherId);
  if (problems.length > 0) {
    return { ok: false, message: problems[0] };
  }

  // A block changes what every list shows, so refresh them all.
  for (const page of ["/graph", "/people", "/matches", "/requests", "/messages"]) {
    revalidatePath(page);
  }
  return { ok: true, message: "Blocked. You won't see each other any more." };
}

export async function reportPersonAction(
  address: string,
  reason: string,
): Promise<SafetyAnswer> {
  const who = await whoIsInvolved(String(address));
  if ("refusal" in who) {
    return { ok: false, message: who.refusal };
  }

  const problems = await reportUser(who.actorId, who.otherId, String(reason));
  if (problems.length > 0) {
    return { ok: false, message: problems[0] };
  }

  // The queue is read fresh each time, but refresh it for cached navigation.
  revalidatePath("/admin/reports");
  return { ok: true, message: "Thank you. An admin will look at your report." };
}
