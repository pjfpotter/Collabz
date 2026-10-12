// THE CHEMISTRY SCORE FORMULA (slice 3, #10, design decisions 1 and 2).
//
//   score = (complement x 3) + overlap + tension
//
// exactly as written in collabz-mvp-brief.md:
//
//   - complement: how many of A's Seeking tags are satisfied by one of B's
//                 Qualities, plus how many of B's Seeking tags are satisfied
//                 by one of A's. This is the main signal, hence the x 3.
//   - overlap:    +1 if they picked the same Energy, +1 if they picked the
//                 same Vibe Diagnosis (a rapport bonus).
//   - tension:    +1 if their Hero Stories are different (a spark bonus).
//
// Skills, Interests and course are NOT in the formula (rule B5). A person's
// Skills and Interests are accepted in `PersonTags` below only so that the
// "why you match" list can show what two people share, and a test pins that
// they never change the number.
//
// WHY THIS FILE HAS NO DATABASE IN IT: the formula takes plain objects and
// gives plain numbers back, so it can be tested with a hand-worked example in
// a few lines, and a beginner can check it against the brief on one screen.
// Loading people and pairings from the database is somebody else's job
// (src/lib/scoring.ts).

// The tags one person picked, grouped by the category they belong to.
// Each list holds tag ids (for example "energy-sea-captain"), never names:
// ids never change, names can be reworded by an admin (rule B2).
export type PersonTags = {
  heroStory: string[];
  energy: string[];
  vibeDiagnosis: string[];
  qualities: string[];
  seeking: string[];
  // For information only. Never used by calculateScore.
  skills?: string[];
  interests?: string[];
};

// "This Seeking tag is satisfied by this Quality tag." One row of the
// TagPairing table, with just the two ids.
export type Pairing = {
  seekingTagId: string;
  qualityTagId: string;
};

// The three parts of the score, and the total they make.
export type ScoreResult = {
  score: number;
  complement: number;
  overlap: number;
  tension: number;
};

// How much one satisfied Seeking tag is worth. The brief's "x 3". A named
// constant so the number appears once and the explanation page can use it.
export const COMPLEMENT_WEIGHT = 3;

// ---------------------------------------------------------------------------
// The three parts
// ---------------------------------------------------------------------------

// Finds which of `seeker`'s Seeking tags are satisfied by a Quality that
// `provider` picked. Returns each satisfied Seeking tag id once, however many
// of the provider's Qualities satisfy it.
//
// WHY ONCE: a Seeking tag has more than one pairing. If every satisfying
// Quality counted, a tag with two pairings could be worth double, which
// would quietly favour some tags over others. The brief says "count how many
// of A's Seeking tags match", which is a count of Seeking tags (design 2).
export function findSatisfiedSeekingTags(
  seeker: PersonTags,
  provider: PersonTags,
  pairings: Pairing[],
): string[] {
  // A Set is a list with no duplicates and a fast "is this in it?" check.
  const providerQualities = new Set(provider.qualities);

  // Only pairings the seeker actually asked for AND the provider can answer.
  const satisfied = new Set<string>();
  for (const seekingTagId of seeker.seeking) {
    const isSatisfied = pairings.some(
      (pairing) =>
        pairing.seekingTagId === seekingTagId && providerQualities.has(pairing.qualityTagId),
    );
    if (isSatisfied) {
      satisfied.add(seekingTagId);
    }
  }
  return [...satisfied];
}

// The tag ids that appear in both lists.
//
// People pick exactly one Energy and one Vibe Diagnosis, so this is "did they
// pick the same one", but written as "what do the lists share" so it still
// works if a category ever lets people pick more than one.
export function findSharedTagIds(first: string[], second: string[]): string[] {
  const secondSet = new Set(second);
  return first.filter((tagId) => secondSet.has(tagId));
}

// Do the two people's Hero Stories differ? (The "tension" bonus.)
//
// A person with no Hero Story picked gets no bonus. "Different" needs two
// stories to compare, and everyone who is scored has finished onboarding,
// which requires one. So this only matters for incomplete data, where giving
// no bonus is the safe answer.
function heroStoriesDiffer(a: PersonTags, b: PersonTags): boolean {
  if (a.heroStory.length === 0 || b.heroStory.length === 0) {
    return false;
  }
  // Different means they have no Hero Story in common.
  return findSharedTagIds(a.heroStory, b.heroStory).length === 0;
}

// ---------------------------------------------------------------------------
// The whole score
// ---------------------------------------------------------------------------

// Works out the score between two people. The order of `a` and `b` does not
// matter: the answer is the same either way round, because the formula looks
// in both directions.
export function calculateScore(a: PersonTags, b: PersonTags, pairings: Pairing[]): ScoreResult {
  // Complement: A's Seeking tags that B can answer, plus the other way round.
  const complement =
    findSatisfiedSeekingTags(a, b, pairings).length +
    findSatisfiedSeekingTags(b, a, pairings).length;

  // Overlap: one point for each of Energy and Vibe Diagnosis that they share.
  // Each is worth at most 1 however many they share, as the brief says "+1 if".
  const sharedEnergy = findSharedTagIds(a.energy, b.energy).length > 0 ? 1 : 0;
  const sharedVibe = findSharedTagIds(a.vibeDiagnosis, b.vibeDiagnosis).length > 0 ? 1 : 0;
  const overlap = sharedEnergy + sharedVibe;

  // Tension: one point when their Hero Stories differ.
  const tension = heroStoriesDiffer(a, b) ? 1 : 0;

  return {
    score: complement * COMPLEMENT_WEIGHT + overlap + tension,
    complement,
    overlap,
    tension,
  };
}
