// One category, as the edit screen needs it (slice 7, #14, design
// decision 6).
//
// Why not slice 0's getCatalogue(): it gives neither the pick limits nor the
// retired tags. Editing needs both, because a tag retired after someone
// picked it stays on their profile until they remove it, so it must be shown
// to them (account-management spec: "Retired tag kept but not offered").
//
// Owner: slice 7 (#14).

import { prisma } from "@/lib/db";

import { SILHOUETTE_CATEGORY_ID, silhouetteCategory, type EditableCategory } from "./standIns";

export type CategoryToEdit = {
  category: EditableCategory;
  // What this person has picked in it now (tag ids, or the silhouette id).
  alreadyPicked: string[];
};

// Null when there's nothing to edit: an unknown or retired category, or no
// finished profile.
export async function getEditableCategory(
  categoryId: string,
  userId: string,
): Promise<CategoryToEdit | null> {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { silhouette: true, completedAt: true },
  });
  if (!profile || profile.completedAt === null) {
    return null;
  }

  // The silhouette is edited like a pick-exactly-one category (see
  // standIns.ts), but it's stored on the profile itself.
  if (categoryId === SILHOUETTE_CATEGORY_ID) {
    return { category: silhouetteCategory(), alreadyPicked: [profile.silhouette] };
  }

  const category = await prisma.category.findFirst({
    where: { id: categoryId, retiredAt: null },
    select: {
      id: true,
      name: true,
      pickMin: true,
      pickMax: true,
      tags: {
        // Every active tag, plus any retired one THIS person still has.
        where: {
          OR: [{ retiredAt: null }, { profileTags: { some: { userId } } }],
        },
        orderBy: { order: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          retiredAt: true,
          profileTags: { where: { userId }, select: { tagId: true } },
        },
      },
    },
  });
  if (!category) {
    return null;
  }

  return {
    category: {
      id: category.id,
      name: category.name,
      pickMin: category.pickMin,
      pickMax: category.pickMax,
      tags: category.tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        description: tag.description,
        retired: tag.retiredAt !== null,
      })),
    },
    alreadyPicked: category.tags.filter((tag) => tag.profileTags.length > 0).map((tag) => tag.id),
  };
}
