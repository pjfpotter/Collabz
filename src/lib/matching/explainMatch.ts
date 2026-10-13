// "WHY YOU MATCH" for pages (slice 3, #10, task 5.2, design decision 8).
//
// Loads two people and hands them to the pure explainScore() in explain.ts.
// All the rules and sentences live there; this file only fetches.
//
// WHY IT WORKS OUT THE EXPLANATION FROM THE TAGS AND NOT FROM THE STORED EDGE:
// the Edge row only holds three numbers, so it can say "you share an Energy"
// but not WHICH one. Working from the tags names the actual tags. The result
// is the same number as the stored score as long as the pair has been
// rescored since either person changed (scoreUser does that on every save).

import { prisma } from "@/lib/db";

import { getEligiblePeople } from "./eligiblePeople";
import { explainScore, type MatchExplanation } from "./explain";

// Explains why two people match, or returns null when there is nothing to
// explain: the same person twice, or either person is not eligible (an
// unfinished profile or a suspended user has no scores).
//
// The first id is "you" in the sentences ("You're looking for ..."), so call
// it once for each viewer.
//
// The result includes everything the stand-in's MatchExplanation had (score,
// sentences, sharedSkills, sharedInterests) and a little more (the three parts
// and each reason's points), so existing callers keep working.
//
// Owner: slice 3 (#10).
export async function explainMatch(
  firstUserId: string,
  secondUserId: string,
): Promise<MatchExplanation | null> {
  if (firstUserId === secondUserId) {
    return null;
  }

  const people = await getEligiblePeople();
  const first = people.find((person) => person.userId === firstUserId);
  const second = people.find((person) => person.userId === secondUserId);
  if (!first || !second) {
    return null;
  }

  // The pairings and tag names change rarely and are small (about 25 and 70
  // rows), so they are simply loaded each time.
  const [pairings, tags] = await Promise.all([
    prisma.tagPairing.findMany({ select: { seekingTagId: true, qualityTagId: true } }),
    prisma.tag.findMany({ select: { id: true, name: true } }),
  ]);
  const tagNames = Object.fromEntries(tags.map((tag) => [tag.id, tag.name]));

  return explainScore(first.tags, second.tags, pairings, tagNames);
}
