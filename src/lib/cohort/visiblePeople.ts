// WHO IS VISIBLE (slice 4, #11, design decision 1).
//
// "Visible" means: this person appears on the graph, in the people list and
// has a profile page. The rule is:
//
//   1. they have FINISHED their profile (Profile.completedAt has a date), and
//   2. they are NOT suspended (User.suspendedAt is empty).
//
// WHY ONE FUNCTION OWNS THIS RULE: "suspended users don't appear" is a safety
// rule (admin spec). The graph, the list and the profile page all need it. If
// each of them wrote its own database query, the rule would be written three
// times and sooner or later forgotten once. So all three start from
// getVisiblePeople() and none of them queries profiles directly.
//
// WHY IT LOADS EVERYONE AT ONCE: a cohort is about 30 to 100 people. Loading
// them all and then filtering in plain code is easier to read and to test
// than a different database query per page, and takes milliseconds.

import { prisma } from "@/lib/db";

// One tag a person picked, with just enough to show it and to group it.
export type VisibleTag = {
  id: string;
  name: string;
  // Which category the tag belongs to, e.g. "energy" or "skills". The profile
  // page groups tags by this, and the filters look for "skills" and
  // "interests".
  categoryId: string;
};

// One visible person: only what the pages are allowed to show.
//
// There is deliberately NO EMAIL here. Emails are never shown to other users
// (rule B1), and the safest way to keep one off a page is never to load it.
export type VisiblePerson = {
  // The database id. It is needed on the SERVER to look up this person's
  // scores, but it must never be sent to the browser: the graph and the links
  // use the alias address instead (see aliasAddress.ts and design decision 2).
  userId: string;
  alias: string;
  // The id of their silhouette picture, e.g. "silhouette-07".
  silhouette: string;
  // Their course. Empty-able in the database, so it can be null here, though
  // everyone who finishes onboarding will have one.
  courseId: string | null;
  courseName: string | null;
  // When they finished their profile. Used to break ties between equal scores
  // ("whoever finished first", the agreed matching rule).
  completedAt: Date;
  tags: VisibleTag[];
};

// Returns every visible person, ordered by alias so the result is the same
// every time it is called.
export async function getVisiblePeople(): Promise<VisiblePerson[]> {
  const profiles = await prisma.profile.findMany({
    where: {
      // Rule 1: the profile is finished.
      completedAt: { not: null },
      // Rule 2: the user it belongs to is not suspended.
      user: { suspendedAt: null },
    },
    orderBy: { alias: "asc" },
    // `select` names exactly the columns we want. Anything not listed here
    // (the email, the photo) is never fetched from the database at all.
    select: {
      userId: true,
      alias: true,
      silhouette: true,
      completedAt: true,
      user: {
        select: {
          courseId: true,
          course: { select: { name: true } },
        },
      },
      tags: {
        // Retired tags are NOT filtered out: a retired tag stays on the
        // profiles that already use it (admin spec).
        select: {
          tag: {
            select: {
              id: true,
              name: true,
              categoryId: true,
              order: true,
              category: { select: { order: true } },
            },
          },
        },
      },
    },
  });

  return profiles.map((profile) => {
    // Put the tags in catalogue order: by category first, then by the tag's
    // own position inside its category. Sorted here in plain code because a
    // database query can't easily sort by "the category of the tag of the
    // picked tag".
    const sortedTags = profile.tags
      .map((profileTag) => profileTag.tag)
      .sort(
        (first, second) =>
          first.category.order - second.category.order || first.order - second.order,
      );

    return {
      userId: profile.userId,
      alias: profile.alias,
      silhouette: profile.silhouette,
      courseId: profile.user.courseId,
      // `?.` and `??` together mean "the course's name, or null if there is
      // no course".
      courseName: profile.user.course?.name ?? null,
      // The query above only returns finished profiles, so completedAt is
      // always set here. The `!` tells TypeScript that, since it can't work
      // it out from the query.
      completedAt: profile.completedAt!,
      tags: sortedTags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        categoryId: tag.categoryId,
      })),
    };
  });
}
