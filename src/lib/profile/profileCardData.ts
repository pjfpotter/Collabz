// Loads what ProfileCard shows for one person (slice 2, #9, design
// decision 9): alias, silhouette, bio, skills and interests, and course.
//
// Server only (it reads the database). Returns null if the person has no
// finished profile.
//
// Never loads the email or the photo: the card can't show them anyway.

import type { ProfileCardProps } from "@/components/ProfileCard";
import { prisma } from "@/lib/db";

import { generateBioLines } from "./bio";

const SKILLS_CATEGORY_ID = "skills";
const INTERESTS_CATEGORY_ID = "interests";

export async function getProfileCard(userId: string): Promise<ProfileCardProps | null> {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: {
      alias: true,
      silhouette: true,
      completedAt: true,
      user: { select: { course: { select: { name: true } } } },
      tags: {
        select: {
          tag: {
            select: {
              name: true,
              order: true,
              categoryId: true,
              category: { select: { order: true } },
            },
          },
        },
      },
    },
  });
  if (!profile || !profile.completedAt) {
    return null;
  }

  // Catalogue order: by category, then by the tag's place in it. The
  // database returns picks in no particular order, so sort them here.
  const tags = profile.tags
    .map((row) => row.tag)
    .sort((a, b) => a.category.order - b.category.order || a.order - b.order);

  // category id -> names of the picked tags, the shape the bio wants.
  const namesByCategory: Record<string, string[]> = {};
  for (const tag of tags) {
    namesByCategory[tag.categoryId] ??= [];
    namesByCategory[tag.categoryId].push(tag.name);
  }

  return {
    alias: profile.alias,
    silhouetteId: profile.silhouette,
    bioLines: generateBioLines(namesByCategory),
    skills: namesByCategory[SKILLS_CATEGORY_ID] ?? [],
    interests: namesByCategory[INTERESTS_CATEGORY_ID] ?? [],
    course: profile.user.course?.name ?? null,
  };
}
