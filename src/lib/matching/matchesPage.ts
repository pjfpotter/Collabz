// WHAT THE /matches PAGE MAY SHOW (slice 3, #10, design decision 9).
//
// getMatchesPage() returns the viewer's top 5 and glitch match as plain
// "cards": alias, silhouette, a link address, a score and the reasons.
//
// WHY THE PAGE DOESN'T BUILD THIS ITSELF: this is the one place that decides
// what another person's card contains. It deliberately has NO EMAIL, NO USER
// ID and NO PHOTO in it (rule B1: people are shown by alias and silhouette
// only), so the page and its components can't show one by accident, because
// they never receive one.

import { aliasToAddress } from "@/lib/cohort/aliasAddress";
import { prisma } from "@/lib/db";

import { explainMatch } from "./explainMatch";
import { ensureGlitchMatch } from "./glitch";
import { getTopFive } from "./topFive";

// One person as the matches page shows them.
export type MatchCardData = {
  // The alias as a page address (/people/<address>), not the user id.
  address: string;
  alias: string;
  // The id of their silhouette picture, e.g. "silhouette-07".
  silhouette: string;
  // Their course, so the card can draw its shape and colour (slice 10, #45).
  // A course id and name are public: the people list and the graph already
  // show them, and neither identifies anyone. Null if they have no course.
  courseId: string | null;
  courseName: string | null;
  score: number;
  // One sentence per reason, ready to show.
  sentences: string[];
  // For information only; never part of the score (rule B5).
  sharedSkills: string[];
  sharedInterests: string[];
};

export type MatchesPageData = {
  // Up to five, best first.
  topFive: MatchCardData[];
  // The surprise match, or null when there isn't one yet (a small cohort).
  glitch: MatchCardData | null;
};

// Loads everything the page shows for one viewer.
//
// This may CREATE the viewer's glitch match if they don't have one yet
// (ensureGlitchMatch). That is on purpose: it is how someone who finished
// before the cohort was big enough gets theirs later (design 5). It changes
// nothing when a valid one is already stored.
export async function getMatchesPage(viewerId: string): Promise<MatchesPageData> {
  const topMatches = await getTopFive(viewerId);
  const glitchUserId = await ensureGlitchMatch(viewerId);

  // One query for every profile we need, rather than one per card.
  const wantedIds = topMatches.map((match) => match.userId);
  if (glitchUserId !== null) {
    wantedIds.push(glitchUserId);
  }
  const profiles = await prisma.profile.findMany({
    where: { userId: { in: wantedIds } },
    // `select` names exactly what we want: no email, no photo key.
    // The course comes through the user. Only its id and name are selected.
    select: {
      userId: true,
      alias: true,
      silhouette: true,
      user: { select: { course: { select: { id: true, name: true } } } },
    },
  });
  const profileByUserId = new Map(profiles.map((profile) => [profile.userId, profile]));

  async function buildCard(otherUserId: string, storedScore?: number) {
    const profile = profileByUserId.get(otherUserId);
    const explanation = await explainMatch(viewerId, otherUserId);
    if (!profile || !explanation) {
      return null; // not eligible any more, e.g. suspended a moment ago
    }
    const card: MatchCardData = {
      address: aliasToAddress(profile.alias),
      alias: profile.alias,
      silhouette: profile.silhouette,
      courseId: profile.user.course?.id ?? null,
      courseName: profile.user.course?.name ?? null,
      // The stored score is what the graph draws, so use it when we have it.
      score: storedScore ?? explanation.score,
      sentences: explanation.sentences,
      sharedSkills: explanation.sharedSkills,
      sharedInterests: explanation.sharedInterests,
    };
    return card;
  }

  const topFive: MatchCardData[] = [];
  for (const match of topMatches) {
    const card = await buildCard(match.userId, match.score);
    if (card) {
      topFive.push(card);
    }
  }

  const glitch = glitchUserId === null ? null : await buildCard(glitchUserId);

  return { topFive, glitch };
}
