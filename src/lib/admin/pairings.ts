// Seeking <-> Quality pairings (slice 8, #15, design 6).
//
// A pairing says "someone seeking X is answered by someone with quality Y".
// The matching slice counts these when it scores a pair of people
// (complement part of the score). They are stored as TagPairing rows.
//
// Changing a pairing does NOT change any stored score by itself. Scores
// change when a person is rescored, which the "Rescore everyone" button does
// (admin spec: "Pairing change alone leaves scores").
//
// Owner: slice 8 (#15).

import { prisma } from "@/lib/db";
import { CATEGORY_IDS } from "@/lib/matching/eligiblePeople";

// Turns "this tag pairs with these tags" into TagPairing rows, whichever side
// the tag is on. For a Seeking tag it is the seeking side of each row; for a
// Quality tag it is the quality side. (Used when adding a tag and when
// replacing a tag's pairings.)
export function pairingRows(
  categoryId: string,
  tagId: string,
  otherTagIds: string[],
): { seekingTagId: string; qualityTagId: string }[] {
  const isSeeking = categoryId === CATEGORY_IDS.seeking;
  // `new Set` drops a tag ticked twice, which would break the table's
  // "one row per pair" rule.
  return [...new Set(otherTagIds)].map((otherTagId) =>
    isSeeking
      ? { seekingTagId: tagId, qualityTagId: otherTagId }
      : { seekingTagId: otherTagId, qualityTagId: tagId },
  );
}

// Checks that every id in `otherTagIds` is a real, active tag in the category
// on the OPPOSITE side from `categoryId`. Returns problems, empty when fine.
//
// Why "active": offering a retired tag as a NEW pair would be pairing it for
// nobody (it can't be picked), so it's refused.
//
// `keepRetiredIds` are retired tags that are ALREADY paired with this tag.
// They are allowed through, so editing a tag's pairings can't silently drop a
// pair that people who picked the retired tag still count in their scores.
export async function findOtherSideTagProblems(
  categoryId: string,
  otherTagIds: string[],
  keepRetiredIds: string[] = [],
): Promise<string[]> {
  const otherCategoryId =
    categoryId === CATEGORY_IDS.seeking ? CATEGORY_IDS.qualities : CATEGORY_IDS.seeking;
  const otherSideName = otherCategoryId === CATEGORY_IDS.qualities ? "Quality" : "Seeking";

  const found = await prisma.tag.findMany({
    where: {
      id: { in: otherTagIds },
      categoryId: otherCategoryId,
      OR: [{ retiredAt: null }, { id: { in: keepRetiredIds } }],
    },
    select: { id: true },
  });

  // `new Set` so a tag ticked twice doesn't look like a missing one.
  const wanted = new Set(otherTagIds);
  if (found.length !== wanted.size) {
    return [`Please pick only active ${otherSideName} tags.`];
  }
  return [];
}

// Replaces ALL of a tag's pairings with the given list, in one transaction.
// Works from either side: pass a Seeking tag with Quality ids, or a Quality
// tag with Seeking ids.
export async function setTagPairings(tagId: string, otherTagIds: string[]): Promise<string[]> {
  const tag = await prisma.tag.findUnique({ where: { id: tagId } });
  if (!tag) {
    return ["That tag doesn't exist."];
  }

  const isPairedCategory =
    tag.categoryId === CATEGORY_IDS.seeking || tag.categoryId === CATEGORY_IDS.qualities;
  if (!isPairedCategory) {
    return ["Only Seeking and Quality tags have pairings."];
  }
  if (otherTagIds.length === 0) {
    // Same rule as when adding: an unpaired tag could never score.
    return ["Please pick at least one tag it pairs with."];
  }

  const isSeeking = tag.categoryId === CATEGORY_IDS.seeking;
  // Pairings this tag has now, on its own side. Retired partners among them
  // may stay (see findOtherSideTagProblems).
  const current = await prisma.tagPairing.findMany({
    where: isSeeking ? { seekingTagId: tagId } : { qualityTagId: tagId },
  });
  const currentPartnerIds = current.map((row) =>
    isSeeking ? row.qualityTagId : row.seekingTagId,
  );

  const problems = await findOtherSideTagProblems(
    tag.categoryId,
    otherTagIds,
    currentPartnerIds,
  );
  if (problems.length > 0) {
    return problems;
  }

  // Remove this tag's old rows (on its own side), then write the new ones.
  const ownSide = isSeeking ? { seekingTagId: tagId } : { qualityTagId: tagId };

  await prisma.$transaction([
    prisma.tagPairing.deleteMany({ where: ownSide }),
    prisma.tagPairing.createMany({
      data: pairingRows(tag.categoryId, tagId, otherTagIds),
    }),
  ]);
  return [];
}
