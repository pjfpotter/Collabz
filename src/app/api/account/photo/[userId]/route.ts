// GET /api/account/photo/[userId] - the ONLY way anyone sees a photo
// (slice 7, #14, design decision 3).
//
// Photos are private files with no public address, so every <img> of a
// photo points here, and this checks who is asking each time:
//   the owner, an admin, or someone connected to them (canSeePhoto).
//
// Answers:
//   200 - the photo's bytes, with its image type
//   404 - for EVERYTHING else: not allowed, not signed in, no such user, or
//         no photo. Why one answer: "403 forbidden" would tell a stranger
//         that a photo exists. The spec says they can't even tell.
//
// "Cache-Control: private, no-store" stops browsers and any shared cache
// keeping a copy, so a block or a removed photo takes effect straight away.
//
// Owner: slice 7 (#14).

import { canSeePhoto } from "@/lib/account/photoRules";
import { readProfilePhoto } from "@/lib/account/photos";
import { getCurrentUser } from "@/lib/currentUser";

const NOT_FOUND = () =>
  new Response("Not found", {
    status: 404,
    headers: { "Cache-Control": "private, no-store" },
  });

// RouteContext is a helper type Next.js generates for each route. In this
// version of Next.js `params` is a Promise, so it has to be awaited.
export async function GET(
  _request: Request,
  context: RouteContext<"/api/account/photo/[userId]">,
): Promise<Response> {
  const { userId } = await context.params;
  const viewer = await getCurrentUser();

  if (!(await canSeePhoto(viewer, userId))) {
    return NOT_FOUND();
  }

  const photo = await readProfilePhoto(userId);
  if (!photo) {
    return NOT_FOUND();
  }

  // Response accepts the bytes as they are. Buffer.from gives it a type
  // TypeScript is sure about.
  return new Response(Buffer.from(photo.bytes), {
    headers: {
      "Content-Type": photo.contentType,
      "Cache-Control": "private, no-store",
      // Tells the browser to trust our Content-Type and not guess, so a
      // stored file can never be treated as a web page.
      "X-Content-Type-Options": "nosniff",
    },
  });
}
