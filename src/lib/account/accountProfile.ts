// What the account page shows about the signed-in person (slice 7, #14).
//
// Loads, in one go: their course (and whether it is still offered), their
// profile (alias, silhouette, whether they have a photo) and their picks,
// grouped by category in the catalogue's order. Retired tags they picked are
// included and marked, because the spec keeps them on the profile until the
// person removes them.
//
// Only for the person's OWN account page. Other people's profiles are slice
// 4's pages, which never show an email.
//
// Owner: slice 7 (#14).

import { prisma } from "@/lib/db";

export type PickedTag = {
  id: string;
  name: string;
  // Retired after they picked it: kept, but can't be picked again.
  retired: boolean;
};

export type CategoryPicks = {
  categoryId: string;
  categoryName: string;
  tags: PickedTag[];
};

export type AccountProfile = {
  email: string;
  course: { id: string; name: string; retired: boolean } | null;
  // Null until they finish onboarding (slice 2).
  profile: {
    alias: string;
    silhouette: string;
    // The photo's storage key, or null. Only used to tell whether there is
    // a photo and to refresh the picture after a change; it's never a
    // public address.
    photoKey: string | null;
    picks: CategoryPicks[];
  } | null;
};

export async function getAccountProfile(userId: string): Promise<AccountProfile> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      email: true,
      course: { select: { id: true, name: true, retiredAt: true } },
      profile: {
        select: {
          alias: true,
          silhouette: true,
          photoKey: true,
          completedAt: true,
          tags: {
            select: {
              tag: {
                select: {
                  id: true,
                  name: true,
                  order: true,
                  retiredAt: true,
                  category: { select: { id: true, name: true, order: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  const course = user.course
    ? { id: user.course.id, name: user.course.name, retired: user.course.retiredAt !== null }
    : null;

  // An unfinished profile counts as no profile here (account-management
  // spec: "No profile yet").
  if (!user.profile || user.profile.completedAt === null) {
    return { email: user.email, course, profile: null };
  }

  return {
    email: user.email,
    course,
    profile: {
      alias: user.profile.alias,
      silhouette: user.profile.silhouette,
      photoKey: user.profile.photoKey,
      picks: groupByCategory(user.profile.tags.map((row) => row.tag)),
    },
  };
}

type TagRow = {
  id: string;
  name: string;
  order: number;
  retiredAt: Date | null;
  category: { id: string; name: string; order: number };
};

// Puts the picked tags under their categories, both in catalogue order.
function groupByCategory(tags: TagRow[]): CategoryPicks[] {
  const sorted = [...tags].sort(
    (a, b) => a.category.order - b.category.order || a.order - b.order,
  );

  const groups: CategoryPicks[] = [];
  for (const tag of sorted) {
    let group = groups.find((existing) => existing.categoryId === tag.category.id);
    if (!group) {
      group = { categoryId: tag.category.id, categoryName: tag.category.name, tags: [] };
      groups.push(group);
    }
    group.tags.push({ id: tag.id, name: tag.name, retired: tag.retiredAt !== null });
  }
  return groups;
}
