// POST and DELETE /api/account/photo - add, replace or remove YOUR OWN photo
// (slice 7, #14, design decision 4).
//
// WHY A ROUTE AND NOT A SERVER ACTION: Server Actions accept at most 1 MB
// unless the shared next.config.ts is changed for every track. A route takes
// the whole 4 MB photo as it is, and this project uses API routes for things
// the browser sends.
//
// There's no user id in the address: you can only ever change your own photo.
//
// POST answers (the form field is called "photo"):
//   401 - nobody is signed in
//   409 - no finished profile yet (the photo lives on the profile)
//   400 - no file sent, or it isn't a JPEG/PNG/WebP up to 4 MB; the existing
//         photo is kept
//   200 - stored: { message }
//
// DELETE answers:
//   401 - nobody is signed in
//   200 - removed, or there was nothing to remove: { message }
//
// Owner: slice 7 (#14).

import { NextResponse } from "next/server";

import { removeProfilePhoto, setProfilePhoto } from "@/lib/account/photos";
import { getCurrentUser } from "@/lib/currentUser";

export async function POST(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "Please sign in." }, { status: 401 });
  }

  // The form sends the file as "multipart/form-data". Anything else (or a
  // broken body) means no usable file.
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("photo");
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "Choose a photo to upload." }, { status: 400 });
  }

  // The file's name and reported type are ignored on purpose: the check
  // looks at the bytes themselves (design decision 2).
  const bytes = new Uint8Array(await file.arrayBuffer());
  const result = await setProfilePhoto(user.id, bytes);

  if (!result.ok) {
    const status = result.reason === "no-finished-profile" ? 409 : 400;
    return NextResponse.json({ message: result.problem }, { status });
  }
  return NextResponse.json({ message: "Photo saved." });
}

export async function DELETE(): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "Please sign in." }, { status: 401 });
  }

  await removeProfilePhoto(user.id);
  return NextResponse.json({ message: "Photo removed." });
}
