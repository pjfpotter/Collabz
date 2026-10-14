// Someone's photo, for the people allowed to see it (slice 7, #14, design
// decision 8; account-management spec: "Connected user sees the photo").
//
// Used on the profile page, /people/[alias]:
//
//   <ProfilePhoto alias={lookup.profile.alias} viewer={viewer} />
//
// It draws the photo only when the person HAS one and the viewer may see it
// (the owner, an admin, or someone connected to them: canSeePhoto). For
// everyone else it draws nothing at all, so a stranger sees the silhouette
// exactly as before and can't tell whether a photo exists.
//
// Why it takes the alias, not a user id: slice 4's profile data
// deliberately holds only what's safe to show, which doesn't include the
// user id. Aliases are unique, so the alias finds the person just as well,
// and slice 4's code doesn't have to change.
//
// The real protection is the photo's address, /api/account/photo/[userId],
// which checks again on every request. Checking here as well means the page
// never shows a broken image to someone that address would refuse.
//
// Owner: slice 7 (#14).

import type { User } from "@/generated/prisma/client";
import { canSeePhoto } from "@/lib/account/photoRules";
import { prisma } from "@/lib/db";

type ProfilePhotoProps = {
  // Whose photo: their alias, e.g. "The Pretend Sea Captain 07".
  alias: string;
  // Who is looking (from getCurrentUser or requireFinishedProfile).
  viewer: Pick<User, "id" | "role"> | null;
};

export async function ProfilePhoto({ alias, viewer }: ProfilePhotoProps) {
  const owner = await prisma.profile.findUnique({
    where: { alias },
    select: { userId: true, photoKey: true },
  });

  if (!owner?.photoKey) {
    return null;
  }
  if (!(await canSeePhoto(viewer, owner.userId))) {
    return null;
  }

  // The random end of the storage key changes when the photo is replaced,
  // so ?v= makes the browser fetch the new one. It's no use to anyone
  // else: the address still checks who is asking.
  const version = owner.photoKey.split("/").pop();

  return (
    // A plain <img>, not Next.js's <Image>: <Image> would copy the photo into
    // a shared optimisation cache, and photos must stay private.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/account/photo/${owner.userId}?v=${version}`}
      alt={`Photo of ${alias}`}
      className="mt-4 h-40 w-40 rounded object-cover"
      data-testid="profile-photo"
    />
  );
}
