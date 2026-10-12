// "WHY YOU MATCH" (slice 3, #10, design decision 8).
//
// Turns two people's tags into a list of plain sentences, one for each part
// of their score, plus the Skills and Interests they share.
//
// WHY THIS USES THE SAME HELPERS AS score.ts: every reason below is found by
// calling the same functions that calculateScore uses. So the sentences can
// never say something the number doesn't (or miss something it counted). A
// test checks that the points on the reasons add up to the score.
//
// Like score.ts, this file has no database in it. Whoever calls it passes in
// the two people, the pairings, and a lookup from tag id to tag name.

import {
  COMPLEMENT_WEIGHT,
  calculateScore,
  findSatisfiedSeekingTags,
  findSharedTagIds,
  type Pairing,
  type PersonTags,
  type ScoreResult,
} from "./score";

// Which part of the score a reason belongs to.
export type ReasonKind = "complement" | "energy" | "vibe" | "tension";

// One reason two people match: a sentence, and how many points it is worth.
export type MatchReason = {
  kind: ReasonKind;
  points: number;
  sentence: string;
};

export type MatchExplanation = ScoreResult & {
  // One entry per point-earning reason, in the order they are explained.
  // The `points` add up to `score`.
  reasons: MatchReason[];
  // The same sentences as `reasons`, ready to show. When there are no
  // reasons it holds one sentence saying so, so a page is never empty.
  sentences: string[];
  // Skills and Interests BOTH picked, by name, for information only. They
  // are never part of the score (rule B5).
  sharedSkills: string[];
  sharedInterests: string[];
};

// A lookup from tag id to the name people see, e.g.
// { "energy-sea-captain": "Giving Sea Captain Energy" }.
export type TagNames = Record<string, string>;

// Shown when a pair has no point-earning reason at all. It is a normal result
// (a glitch match is often like this), so it says so kindly.
export const NO_REASONS_SENTENCE =
  "Nothing in your answers lines up, which is exactly what makes it a surprise.";

// Looks a tag's name up. If the name is missing we fall back to the id,
// which is ugly but never hides a tag or crashes a page.
function nameOf(tagId: string, tagNames: TagNames): string {
  return tagNames[tagId] ?? tagId;
}

// Puts quoted names into one phrase: "A", or "A" and "B".
function quotedList(names: string[]): string {
  return names.map((name) => `"${name}"`).join(" and ");
}

// The reasons for ONE direction: what `seeker` is after that `provider`
// answers. `seekerIsViewer` says whether the seeker is "you" in the sentence.
function complementReasons(
  seeker: PersonTags,
  provider: PersonTags,
  pairings: Pairing[],
  tagNames: TagNames,
  seekerIsViewer: boolean,
): MatchReason[] {
  const providerQualities = new Set(provider.qualities);

  return findSatisfiedSeekingTags(seeker, provider, pairings).map((seekingTagId) => {
    // Which of the provider's Qualities satisfy this Seeking tag. Sorted by
    // id so the sentence is the same on every load.
    const qualityNames = pairings
      .filter(
        (pairing) =>
          pairing.seekingTagId === seekingTagId && providerQualities.has(pairing.qualityTagId),
      )
      .map((pairing) => pairing.qualityTagId)
      .sort()
      .map((qualityTagId) => nameOf(qualityTagId, tagNames));

    const wanted = `"${nameOf(seekingTagId, tagNames)}"`;
    const offered = quotedList(qualityNames);
    const sentence = seekerIsViewer
      ? `You're looking for ${wanted}, and they bring ${offered}.`
      : `They're looking for ${wanted}, and you bring ${offered}.`;

    return { kind: "complement" as const, points: COMPLEMENT_WEIGHT, sentence };
  });
}

// Explains the score between the viewer (`you`) and someone else (`them`).
// "You" in the sentences is the first person, so call this once per viewer.
export function explainScore(
  you: PersonTags,
  them: PersonTags,
  pairings: Pairing[],
  tagNames: TagNames,
): MatchExplanation {
  // The number itself, from the one formula.
  const result = calculateScore(you, them, pairings);

  const reasons: MatchReason[] = [
    ...complementReasons(you, them, pairings, tagNames, true),
    ...complementReasons(them, you, pairings, tagNames, false),
  ];

  const sharedEnergy = findSharedTagIds(you.energy, them.energy);
  if (sharedEnergy.length > 0) {
    reasons.push({
      kind: "energy",
      points: 1,
      sentence: `You both picked the same Energy: "${nameOf(sharedEnergy[0], tagNames)}".`,
    });
  }

  const sharedVibe = findSharedTagIds(you.vibeDiagnosis, them.vibeDiagnosis);
  if (sharedVibe.length > 0) {
    reasons.push({
      kind: "vibe",
      points: 1,
      sentence: `You both picked the same Vibe Diagnosis: "${nameOf(sharedVibe[0], tagNames)}".`,
    });
  }

  // The same rule score.ts uses: tension is on exactly when the number says so.
  if (result.tension === 1) {
    reasons.push({
      kind: "tension",
      points: 1,
      sentence: "Your Hero Stories are different, which adds some spark.",
    });
  }

  const sentences =
    reasons.length > 0 ? reasons.map((reason) => reason.sentence) : [NO_REASONS_SENTENCE];

  return {
    ...result,
    reasons,
    sentences,
    sharedSkills: sharedNames(you.skills ?? [], them.skills ?? [], tagNames),
    sharedInterests: sharedNames(you.interests ?? [], them.interests ?? [], tagNames),
  };
}

// The names of the tags two lists have in common, in a steady order.
function sharedNames(first: string[], second: string[], tagNames: TagNames): string[] {
  return findSharedTagIds(first, second)
    .sort()
    .map((tagId) => nameOf(tagId, tagNames));
}
