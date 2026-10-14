// Setting, removing and reading a profile photo (slice 7, #14, design
// decision 4).
//
// These are the only functions that change Profile.photoKey or the photo
// files. The routes in src/app/api/account/photo/ call them, and so can the
// admin actions in slices 8 and 9 ("remove a user's photo"):
//
//   import { removeProfilePhoto } from "@/lib/account/photos";
//
// `store` is where photos are kept. Normal callers leave it out and get the
// app's storage (getPhotoStore); the tests pass a temporary folder.
//
// Owner: slice 7 (#14).

import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/db";

import { checkPhotoFile } from "./photoRules";
import { getPhotoStore, type PhotoStore, type StoredPhoto } from "./photoStore";

// A refusal says WHY in words for the person (`problem`), and as a short
// code for the route (`reason`), which answers differently for each.
export type SetPhotoResult =
  | { ok: true }
  | { ok: false; reason: "not-a-photo" | "no-finished-profile"; problem: string };

// Store `bytes` as this user's photo, replacing any photo they had.
//
// THE ORDER MATTERS (design decision 4):
//   1. check the file,
//   2. store the new file,
//   3. point the profile at it,
//   4. delete the old file.
// If anything fails part-way, the worst that can happen is a file nobody
// points at. The profile never points at a file that isn't there.
export async function setProfilePhoto(
  userId: string,
  bytes: Uint8Array,
  store: PhotoStore = getPhotoStore(),
): Promise<SetPhotoResult> {
  const check = checkPhotoFile(bytes);
  if (!check.ok) {
    // Nothing is stored and the existing photo (if any) is kept.
    return { ok: false, reason: "not-a-photo", problem: check.problem };
  }

  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { photoKey: true, completedAt: true },
  });
  // The photo lives on the profile, so there must be a finished one.
  if (!profile || profile.completedAt === null) {
    return {
      ok: false,
      reason: "no-finished-profile",
      problem: "Finish setting up your profile before adding a photo.",
    };
  }

  // A new random name every time, so a replacement never has the same key
  // as the photo it replaces.
  const newKey = `photos/${userId}/${randomUUID()}.${check.type.extension}`;
  await store.put(newKey, bytes, check.type.contentType);

  await prisma.profile.update({ where: { userId }, data: { photoKey: newKey } });

  if (profile.photoKey) {
    await store.delete(profile.photoKey);
  }
  return { ok: true };
}

// Remove this user's photo: the profile stops pointing at it, then the file
// is deleted (account-management spec: "Remove a photo").
//
// Safe to call when there's no photo. Shared helper for slices 8 and 9.
export async function removeProfilePhoto(
  userId: string,
  store: PhotoStore = getPhotoStore(),
): Promise<void> {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { photoKey: true },
  });
  if (!profile?.photoKey) {
    return;
  }

  // Clear the key first, for the same reason as the order above: if the
  // delete then fails, nobody is shown a photo that's half gone.
  await prisma.profile.update({ where: { userId }, data: { photoKey: null } });
  await store.delete(profile.photoKey);
}

// The photo itself, for the serving route. Null if there isn't one.
// It does NOT check who is asking: callers must check canSeePhoto first.
export async function readProfilePhoto(
  ownerId: string,
  store: PhotoStore = getPhotoStore(),
): Promise<StoredPhoto | null> {
  const profile = await prisma.profile.findUnique({
    where: { userId: ownerId },
    select: { photoKey: true },
  });
  if (!profile?.photoKey) {
    return null;
  }
  return store.get(profile.photoKey);
}
