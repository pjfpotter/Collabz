// STAND-INS: temporary versions of things OTHER TRACKS own (slice 4, #11,
// design decision 9).
//
// The graph, the people list and the profile page need six things that
// belong to tracks 2, 3 and 5, and those tracks are being built at the same
// time as this one. Instead of waiting, track 4 uses the simple versions in
// this file.
//
// WHY THEY ARE ALL IN ONE FILE: join-up (#17) is then one mechanical job:
// open this file, replace the inside of each function with a call to the real
// one, and delete whatever is left. Nobody has to hunt through the pages.
//
// THE RULE FOR TRACK 4's OWN CODE: import these six names from here and
// nowhere else. Never import another track's files directly (CLAUDE.md).
//
// | Stand-in                | Real owner     | Swapped for                       |
// |-------------------------|----------------|-----------------------------------|
// | getTopFive              | track 3 (#10)  | track 3's top 5 query             |
// | explainMatch            | track 3 (#10)  | track 3's real breakdown          |
// | sendConnectionRequest   | track 5 (#12)  | track 5's request helper          |
// | profileBio              | track 2 (#9)   | generateBio()                     |
// | SilhouetteStandIn       | track 2 (#9)   | silhouetteUrl() + the 12 pictures |
// | requireFinishedProfile  | track 2 (#9)   | redirectIfOnboardingIncomplete()  |
//
// The names for tracks 3 and 5 are track 4's PROPOSAL. They are not agreed
// yet (task 1.2), so join-up may also need to rename them.
//
// This file ends in .tsx, not .ts, only because SilhouetteStandIn returns a
// picture written as JSX, and JSX is only allowed in .tsx files.

import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/currentUser";
import { prisma } from "@/lib/db";
import { orderUserPair } from "@/lib/userPair";

import type { User } from "@/generated/prisma/client";

import { getVisiblePeople } from "./visiblePeople";

// ---------------------------------------------------------------------------
// 1. getTopFive
// ---------------------------------------------------------------------------

// How many matches "top 5" means. A named constant so the number appears once.
const TOP_MATCH_COUNT = 5;

// One of a user's best matches.
export type TopMatch = {
  userId: string;
  score: number;
};

// STAND-IN for track 3 (#10). Proposed real name: getTopFive(userId).
// Join-up: replace the inside with a call to track 3's top 5 query, and check
// both versions leave out suspended people (design, Open Questions).
//
// Returns the user's (up to) five best matches, best first, using the scores
// already stored in the Edge table.
//
// - Only VISIBLE people can be a match. A suspended person isn't on the
//   graph, so a highlighted match nobody can see or contact would be
//   confusing.
// - Equal scores: whoever finished their profile first comes first (the
//   agreed matching rule). If even that is equal, the lower user id, so the
//   answer is always the same.
// - Fewer than five visible matches: returns as many as there are.
export async function getTopFive(userId: string): Promise<TopMatch[]> {
  const visiblePeople = await getVisiblePeople();

  // A lookup from user id to "when they finished their profile". A Map is
  // like a dictionary: give it an id and it hands back the date. Its second
  // job is the visibility check: if an id isn't in the map, that person is
  // not visible.
  const finishedAtByUserId = new Map<string, Date>();
  for (const person of visiblePeople) {
    finishedAtByUserId.set(person.userId, person.completedAt);
  }

  // A pair's score is stored ONCE, with the lower user id in userAId. So this
  // user can be on either side of the row, and we have to ask for both.
  const edges = await prisma.edge.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
  });

  const matches: (TopMatch & { finishedAt: Date })[] = [];
  for (const edge of edges) {
    // Whichever side of the row ISN'T this user is the other person.
    const otherUserId = edge.userAId === userId ? edge.userBId : edge.userAId;

    const finishedAt = finishedAtByUserId.get(otherUserId);
    if (!finishedAt) {
      // Not in the map, so not visible (suspended or unfinished). Skip them.
      continue;
    }
    matches.push({ userId: otherUserId, score: edge.score, finishedAt });
  }

  matches.sort((first, second) => {
    // Highest score first. (second - first gives "biggest first".)
    if (first.score !== second.score) {
      return second.score - first.score;
    }
    // Same score: earliest finisher first.
    if (first.finishedAt.getTime() !== second.finishedAt.getTime()) {
      return first.finishedAt.getTime() - second.finishedAt.getTime();
    }
    // Still equal: lower user id first, so the order never changes by chance.
    return first.userId < second.userId ? -1 : 1;
  });

  return matches
    .slice(0, TOP_MATCH_COUNT)
    .map((match) => ({ userId: match.userId, score: match.score }));
}

// ---------------------------------------------------------------------------
// 2. explainMatch
// ---------------------------------------------------------------------------

// The catalogue category ids for the two "for information" lists. These
// categories arrive with slice 2 (#9). Until then nobody has tags in them and
// both lists come back empty.
const SKILLS_CATEGORY_ID = "skills";
const INTERESTS_CATEGORY_ID = "interests";

// Why two people match, in a form a page can show.
export type MatchExplanation = {
  score: number;
  // One short sentence per part of the score.
  sentences: string[];
  // Skills and interests BOTH people picked. Shown "for information" only:
  // they are not part of the score (rule B5).
  sharedSkills: string[];
  sharedInterests: string[];
};

// STAND-IN for track 3 (#10). Proposed real name:
// explainMatch(userAId, userBId).
// Join-up: replace the inside with track 3's real breakdown, which can name
// the actual tags that fit together.
//
// Explains the stored score between two users, or returns null if no score is
// stored for the pair. The two ids can be passed either way round.
//
// It reads only the three numbers stored on the edge, so it can say "you
// share an Energy or a Vibe Diagnosis" but NOT which one. With the pretend
// cohort the numbers are made up and don't line up with the tags at all,
// which is another reason not to name tags here.
export async function explainMatch(
  firstUserId: string,
  secondUserId: string,
): Promise<MatchExplanation | null> {
  // orderUserPair puts the two ids in the order the Edge table stores them.
  const pair = orderUserPair(firstUserId, secondUserId);

  const edge = await prisma.edge.findUnique({
    where: { userAId_userBId: pair },
  });
  if (!edge) {
    return null;
  }

  const sentences = [
    describeComplement(edge.complement),
    describeOverlap(edge.overlap),
    describeTension(edge.tension),
  ];

  // Every tag either of the two picked, with who picked it.
  const pickedTags = await prisma.profileTag.findMany({
    where: {
      userId: { in: [firstUserId, secondUserId] },
      tag: { categoryId: { in: [SKILLS_CATEGORY_ID, INTERESTS_CATEGORY_ID] } },
    },
    select: {
      userId: true,
      tag: { select: { id: true, name: true, categoryId: true, order: true } },
    },
    orderBy: { tag: { order: "asc" } },
  });

  // A tag is "shared" when the second user picked it too. So: collect the
  // second user's tag ids, then keep the first user's picks that are in it.
  const secondUsersTagIds = new Set(
    pickedTags
      .filter((picked) => picked.userId === secondUserId)
      .map((picked) => picked.tag.id),
  );
  const sharedTags = pickedTags
    .filter((picked) => picked.userId === firstUserId)
    .map((picked) => picked.tag)
    .filter((tag) => secondUsersTagIds.has(tag.id));

  return {
    score: edge.score,
    sentences,
    sharedSkills: sharedTags
      .filter((tag) => tag.categoryId === SKILLS_CATEGORY_ID)
      .map((tag) => tag.name),
    sharedInterests: sharedTags
      .filter((tag) => tag.categoryId === INTERESTS_CATEGORY_ID)
      .map((tag) => tag.name),
  };
}

// Complement is how many times one person's "Seeking" fits the other's
// "Quality", counted in both directions. It is worth 3 points each.
function describeComplement(complement: number): string {
  if (complement === 0) {
    return "Complement: 0. Neither of you is looking for what the other brings.";
  }
  return `Complement: ${complement}. What one of you is looking for, the other brings.`;
}

// Overlap is 1 point for the same Energy and 1 for the same Vibe Diagnosis,
// so it is 0, 1 or 2.
function describeOverlap(overlap: number): string {
  if (overlap >= 2) {
    return "You share both an Energy and a Vibe Diagnosis.";
  }
  if (overlap === 1) {
    return "You share an Energy or a Vibe Diagnosis.";
  }
  return "You don't share an Energy or a Vibe Diagnosis.";
}

// Tension is 1 point when the two Hero Stories are different, otherwise 0.
function describeTension(tension: number): string {
  if (tension >= 1) {
    return "Your Hero Stories differ.";
  }
  return "You have the same Hero Story.";
}

// ---------------------------------------------------------------------------
// 3. sendConnectionRequest
// ---------------------------------------------------------------------------

// What the page is told after trying to send a request.
export type SendConnectionRequestResult = {
  // true once a request really has been stored. Always false for now.
  sent: boolean;
  // A sentence the page can show as it is.
  message: string;
};

// The exact sentence, exported so the pages and the tests use the same one.
export const REQUESTS_NOT_SWITCHED_ON_MESSAGE =
  "Connection requests aren't switched on yet.";

// STAND-IN for track 5 (#12). Proposed real name:
// sendConnectionRequest(fromUserId, toUserId).
// Join-up: replace the inside with a call to track 5's helper, and agree what
// it returns when it refuses (design, Open Questions).
//
// STORES NOTHING. It only answers "not switched on yet". Track 5 owns the
// ConnectionRequest table's rules (who may ask whom, no duplicates, blocks),
// so writing rows here would mean guessing those rules.
//
// It is `async` and takes both ids, although it uses neither yet, so that the
// code calling it won't have to change when the real one arrives.
export async function sendConnectionRequest(
  fromUserId: string,
  toUserId: string,
): Promise<SendConnectionRequestResult> {
  // Neither id is used yet. `void` tells the linter "unused on purpose", so
  // it doesn't warn about them.
  void fromUserId;
  void toUserId;

  return { sent: false, message: REQUESTS_NOT_SWITCHED_ON_MESSAGE };
}

// ---------------------------------------------------------------------------
// 4. profileBio
// ---------------------------------------------------------------------------

const HERO_STORY_CATEGORY_ID = "hero-story";
const ENERGY_CATEGORY_ID = "energy";

// STAND-IN for track 2 (#9). Real name: generateBio(tagsByCategory).
// Join-up: replace the inside with a call to generateBio(), which writes a
// fuller bio from every category.
//
// Writes one plain sentence from a person's Hero Story and Energy.
//
// `tagsByCategory` is an object from category id to the NAMES of the tags the
// person picked there, for example:
//
//   { "hero-story": ["The Corporate Escapee"], "energy": ["Giving Sea Captain Energy"] }
//
// The sentence is built only from tag names the person picked. There is no
// free text anywhere in a profile (rule B1).
export function profileBio(tagsByCategory: Record<string, string[]>): string {
  // `?.[0]` is "the first one, if there are any". Both categories are
  // pick-exactly-one, so the first is the only one.
  const heroStory = tagsByCategory[HERO_STORY_CATEGORY_ID]?.[0];
  const energy = tagsByCategory[ENERGY_CATEGORY_ID]?.[0];

  // Energy tags already read as a phrase ("Giving Sea Captain Energy"), so
  // lower-casing the first letter lets it follow a comma naturally.
  if (heroStory && energy) {
    return `${heroStory}, ${lowerCaseFirstLetter(energy)}.`;
  }
  if (heroStory) {
    return `${heroStory}.`;
  }
  if (energy) {
    return `${energy}.`;
  }
  // Shouldn't happen for a finished profile, but a page must never crash or
  // show "undefined" because of a missing tag.
  return "This person hasn't picked a Hero Story or an Energy yet.";
}

function lowerCaseFirstLetter(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

// ---------------------------------------------------------------------------
// 5. SilhouetteStandIn
// ---------------------------------------------------------------------------

type SilhouetteStandInProps = {
  // The person's silhouette id, e.g. "silhouette-07". Not used to choose a
  // picture yet (there is only one), but taken now so the pages don't change
  // when the real pictures arrive.
  silhouette: string;
  // Width and height in pixels. The picture is square.
  size?: number;
};

// STAND-IN for track 2 (#9). Real version: silhouetteUrl(id) and the 12
// pictures in public/silhouettes/.
// Join-up: replace the <svg> with an <img> whose src is silhouetteUrl(id).
//
// Draws ONE neutral head-and-shoulders shape for everybody.
//
// - It is an inline SVG (a picture written as shapes), so there is no image
//   file to load.
// - `fill="currentColor"` makes it take the colour of the text around it, so
//   it works in light and dark mode with no extra code.
// - `aria-hidden` tells screen readers to skip it. It is decoration: the
//   alias is always written next to it, and everyone's picture is the same.
export function SilhouetteStandIn({ silhouette, size = 48 }: SilhouetteStandInProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="currentColor"
      aria-hidden="true"
      // Lets a test, or anyone looking in dev tools, see which silhouette
      // this person chose even though the picture doesn't show it yet.
      data-silhouette={silhouette}
    >
      {/* The head. */}
      <circle cx="24" cy="17" r="9" />
      {/* The shoulders: a curve from bottom-left, up over, to bottom-right. */}
      <path d="M6 44c0-10 8-16 18-16s18 6 18 16z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 6. requireFinishedProfile
// ---------------------------------------------------------------------------

// STAND-IN for track 2 (#9). Real name: redirectIfOnboardingIncomplete().
// Join-up: replace the inside with a call to it.
//
// The check at the top of every track 4 page:
//
//   const viewer = await requireFinishedProfile();
//
// - Nobody signed in            -> sent to /signin.
// - Signed in, profile not done -> sent to /onboarding.
// - Otherwise                   -> returns the signed-in user.
//
// redirect() works by throwing, so the page stops right there and nothing
// after the call runs.
//
// It does NOT turn away a suspended user: "suspended users can't sign in" is
// slice 1's rule (see getCurrentUser). A suspended viewer would see the graph
// without being on it.
export async function requireFinishedProfile(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin");
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { completedAt: true },
  });
  // `!profile?.completedAt` covers both "no profile row at all" and "a
  // profile that was started but not finished".
  if (!profile?.completedAt) {
    redirect("/onboarding");
  }

  return user;
}
