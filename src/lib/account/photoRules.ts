// The two rules that protect photos (slice 7, #14, design decisions 2 and 3):
//
//   - checkPhotoFile: is this file a photo we accept?
//   - canSeePhoto:    may this person see that person's photo?
//
// Both are checked on the server every time, whatever the browser already
// checked. The browser's checks are only there to give a quicker message.
//
// Owner: slice 7 (#14).

import type { User } from "@/generated/prisma/client";
import { areConnected } from "@/lib/requests/areConnected";

// ---------------------------------------------------------------------------
// Which files we accept
// ---------------------------------------------------------------------------

// 4 MB (Tom's decision, 14 Oct 2026). Vercel refuses any request over about
// 4.5 MB before our code even runs, so this leaves room for the rest of the
// form.
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

export type PhotoType = {
  contentType: "image/jpeg" | "image/png" | "image/webp";
  // The file ending used in the storage key.
  extension: "jpg" | "png" | "webp";
};

export type PhotoCheck = { ok: true; type: PhotoType } | { ok: false; problem: string };

// Checks a photo by its SIZE and its FIRST BYTES.
//
// Why the first bytes, not the file name or the type the browser reports:
// both of those are just labels, and anyone can rename a PDF to "me.jpg".
// Every JPEG, PNG and WebP file starts with a fixed pattern of bytes (its
// "signature"), so that's what we look at.
export function checkPhotoFile(bytes: Uint8Array): PhotoCheck {
  if (bytes.length === 0) {
    return { ok: false, problem: "That file is empty. Choose a photo." };
  }
  if (bytes.length > MAX_PHOTO_BYTES) {
    return {
      ok: false,
      problem: "That photo is bigger than 4 MB. Choose a smaller one, or a screenshot of it.",
    };
  }

  const type = detectPhotoType(bytes);
  if (!type) {
    return { ok: false, problem: "That isn't a JPEG, PNG or WebP photo." };
  }
  return { ok: true, type };
}

// Does `bytes` start with `signature`, beginning `offset` bytes in?
function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  return signature.every((value, index) => bytes[offset + index] === value);
}

function detectPhotoType(bytes: Uint8Array): PhotoType | null {
  // JPEG: FF D8 FF
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return { contentType: "image/jpeg", extension: "jpg" };
  }
  // PNG: 89 then the letters "PNG", then CR LF, Ctrl-Z, LF
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { contentType: "image/png", extension: "png" };
  }
  // WebP: the letters "RIFF", four bytes giving the file's size, then "WEBP"
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return { contentType: "image/webp", extension: "webp" };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Who may see a photo
// ---------------------------------------------------------------------------

// May `viewer` see the photo of the user with id `ownerId`?
// (account-management spec: "Optional photo, private until connected")
//
//   - nobody signed in        -> no
//   - the owner themselves    -> yes
//   - an admin                -> yes (to deal with reports)
//   - someone connected to them (an approved request and no block between
//     them: areConnected, written by slice 5 for exactly this) -> yes
//   - anyone else             -> no
//
// `viewer` is what getCurrentUser() returned, which is already null for a
// suspended or unfinished real user (slice 1), so they can't see photos
// either.
export async function canSeePhoto(
  viewer: Pick<User, "id" | "role"> | null,
  ownerId: string,
): Promise<boolean> {
  if (!viewer) {
    return false;
  }
  if (viewer.id === ownerId) {
    return true;
  }
  if (viewer.role === "ADMIN") {
    return true;
  }
  // Checked last because it's the only rule that asks the database.
  return areConnected(viewer.id, ownerId);
}
