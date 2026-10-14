"use server";
// The Server Actions behind /admin/users (slice 8, #15, design 1 and 8).
//
// EVERY action calls requireAdmin() as its first line, because a Server
// Action is a public address anyone can post to. suspendUserAction uses the
// admin it returns, so "you can't suspend yourself" is checked against the
// real signed-in admin and not against a value the form sent.
//
// After a change we refresh the pages that list people, so a suspended user
// vanishes from the graph and search straight away.

import { removePhoto, suspendUser, unsuspendUser } from "@/lib/admin/users";
import { requireAdmin } from "@/lib/currentUser";

import { redirectBack } from "../redirectBack";

const PAGE = "/admin/users";
// /people is refreshed too: a profile page shows the photo to connected people.
const REFRESH = ["/graph", "/people", "/matches"];

export async function suspendUserAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const userId = String(formData.get("id") ?? "");
  redirectBack(PAGE, REFRESH, await suspendUser(admin.id, userId));
}

export async function unsuspendUserAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const userId = String(formData.get("id") ?? "");
  redirectBack(PAGE, REFRESH, await unsuspendUser(userId));
}

export async function removePhotoAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const userId = String(formData.get("id") ?? "");
  redirectBack(PAGE, REFRESH, await removePhoto(userId));
}
