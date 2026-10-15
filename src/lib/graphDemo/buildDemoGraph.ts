// BUILDS THE DEMO GRAPH FOR WHATEVER THE VISITOR HAS PICKED (graph-demo, group 3).
//
//   picks (or none)  ->  nodes, links, top 5, glitch match, and the details
//                        the tap panel shows
//
// It is a plain function. No database, no server, no randomness: the same
// picks give the same graph on every phone, so two students comparing screens
// see the same thing and a test can pin it (design decision 6).
//
// WHY THE SCORES ARE WORKED OUT HERE AND NOT LOADED: the real app stores a
// score for each pair in the database. The demo has no database, so it works
// every pair out on the spot with the REAL formula (calculateScore) and the
// REAL pairings, so the demo can't drift away from what the product does.
//
// WHAT IS REUSED, AND WHAT IS NOT:
//   - calculateScore and explainScore: the real formula and the real
//     "why you match" sentences (both are database-free).
//   - buildGraph: the real rules for line thickness, top 5 flags and glitch
//     lines (graphShape.ts, moved out of graphData.ts in group 2).
//   - NOT reused: getTopFive and the glitch-match code in src/lib/matching.
//     They are built around database rows and import the database client, so
//     they can't run in a browser. The demo has its own small versions below.

import {
  seedCategories,
  seedCourses,
  seedPairings,
} from "../../../prisma/seed-data";

import { aliasToAddress } from "@/lib/cohort/aliasAddress";
import { buildGraph, type GraphData } from "@/lib/cohort/graphShape";
import type { VisiblePerson, VisibleTag } from "@/lib/cohort/visiblePeople";
import { baseAlias } from "@/lib/profile/alias";
import { explainScore, type TagNames } from "@/lib/matching/explain";
import {
  calculateScore,
  type Pairing,
  type PersonTags,
} from "@/lib/matching/score";

import { DEMO_COHORT } from "./demoCohort";

// ---------------------------------------------------------------------------
// The catalogue, as lookups (built once, when the file first loads)
// ---------------------------------------------------------------------------

// Every real pairing, one Seeking tag and one Quality per row, which is the
// shape the score formula wants. seedPairings lists several Qualities per
// Seeking tag, so each one becomes its own row.
const PAIRINGS: Pairing[] = seedPairings.flatMap((pairing) =>
  pairing.qualityTagIds.map((qualityTagId) => ({
    seekingTagId: pairing.seekingTagId,
    qualityTagId,
  })),
);

// Tag id -> the name people read, and tag id -> the alias word it adds
// ("Feral", "Gremlin"), which the visitor's own alias is built from.
const TAG_NAMES: TagNames = {};
const ALIAS_WORD_OF_TAG: Record<string, string | undefined> = {};
for (const category of seedCategories) {
  for (const tag of category.tags) {
    TAG_NAMES[tag.id] = tag.name;
    ALIAS_WORD_OF_TAG[tag.id] = tag.aliasWord;
  }
}

const COURSE_NAME: Record<string, string> = {};
for (const course of seedCourses) {
  COURSE_NAME[course.id] = course.name;
}

// ---------------------------------------------------------------------------
// What the visitor picked
// ---------------------------------------------------------------------------

// The five categories that make up a score. Skills and Interests are left
// out on purpose: they are never part of a score (rule B5), so asking for
// them would only make the picker longer.
export type DemoPicks = {
  heroStory: string[];
  energy: string[];
  vibeDiagnosis: string[];
  qualities: string[];
  seeking: string[];
};

// Which DemoPicks field belongs to which catalogue category. The picker uses
// this too, so there is one list of "what can be picked".
export const PICK_CATEGORIES: { field: keyof DemoPicks; categoryId: string }[] =
  [
    { field: "heroStory", categoryId: "hero-story" },
    { field: "energy", categoryId: "energy" },
    { field: "vibeDiagnosis", categoryId: "vibe-diagnosis" },
    { field: "qualities", categoryId: "qualities" },
    { field: "seeking", categoryId: "seeking" },
  ];

// Nothing picked yet.
export const NO_PICKS: DemoPicks = {
  heroStory: [],
  energy: [],
  vibeDiagnosis: [],
  qualities: [],
  seeking: [],
};

// Has the visitor picked enough in every category to be scored? "Enough" is
// each category's own minimum from the catalogue, the same rule onboarding
// uses. Until then the graph is shown WITHOUT the visitor in it, rather than
// scoring someone with half a profile.
export function arePicksComplete(picks: DemoPicks): boolean {
  return PICK_CATEGORIES.every(({ field, categoryId }) => {
    const category = seedCategories.find(
      (candidate) => candidate.id === categoryId,
    );
    return category !== undefined && picks[field].length >= category.pickMin;
  });
}

// ---------------------------------------------------------------------------
// What the tap panel needs on top of what the real graph node carries
// ---------------------------------------------------------------------------

// The real graph's node holds an alias, a course and a score, but not tags or
// reasons (on the real site those are on the profile page, which the demo
// does not have). So the demo passes them alongside, keyed by the node's id.
export type DemoPersonDetails = {
  // The tags this person picked, by name, in catalogue order.
  tagNames: string[];
  // "Why you match" sentences from the real explainScore. Empty when there is
  // no viewer yet, and for the viewer themselves.
  reasons: string[];
};

export type DemoGraph = {
  graph: GraphData;
  // Keyed by the node's id (the alias address).
  details: Record<string, DemoPersonDetails>;
};

// The id the visitor gets in the graph. Never matches a demo person's id.
const VIEWER_ID = "demo-you";

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

// A person's tags in the shape the score formula reads.
function toPersonTags(picks: DemoPicks): PersonTags {
  return {
    heroStory: picks.heroStory,
    energy: picks.energy,
    vibeDiagnosis: picks.vibeDiagnosis,
    qualities: picks.qualities,
    seeking: picks.seeking,
  };
}

// Every picked tag id, flattened, in catalogue order (the order the
// categories are listed in seedCategories, then the tag order inside each).
function tagNamesInCatalogueOrder(picks: DemoPicks): string[] {
  const picked = new Set(Object.values(picks).flat());
  const names: string[] = [];
  for (const category of seedCategories) {
    for (const tag of category.tags) {
      if (picked.has(tag.id)) {
        names.push(tag.name);
      }
    }
  }
  return names;
}

// A number made from the visitor's picks, used to choose their glitch match.
//
// WHY NOT Math.random: the same picks must give the same glitch match on
// every phone and every reload (design decision 6). This is the "djb2" text
// hash: start at 5381, then for each character multiply by 33 and add the
// character's code. The details don't matter; what matters is that it is the
// same every time and spreads different inputs out.
function hashOfPicks(picks: DemoPicks): number {
  const text = PICK_CATEGORIES.map(({ field }) =>
    [...picks[field]].sort().join(","),
  ).join("|");
  let hash = 5381;
  for (let index = 0; index < text.length; index += 1) {
    // `>>> 0` keeps the number a positive 32-bit whole number.
    hash = ((hash * 33) ^ text.charCodeAt(index)) >>> 0;
  }
  return hash;
}

// The visitor's alias, built the way a real one is. "(you)" is added so it
// can never be mistaken for one of the invented people who happens to share
// the same Vibe and Energy words.
function viewerAlias(picks: DemoPicks): string {
  const vibeWord = ALIAS_WORD_OF_TAG[picks.vibeDiagnosis[0]];
  const energyWord = ALIAS_WORD_OF_TAG[picks.energy[0]];
  return `${baseAlias(vibeWord, energyWord)} (you)`;
}

// A demo person as the graph's "visible person". The graph only reads alias,
// silhouette and course from this; the rest is filled in so the type is
// satisfied.
function toVisiblePerson(
  userId: string,
  alias: string,
  silhouette: string,
  courseId: string | null,
  tags: VisibleTag[],
): VisiblePerson {
  return {
    userId,
    alias,
    silhouette,
    courseId,
    courseName: courseId === null ? null : (COURSE_NAME[courseId] ?? null),
    // Not used by the graph. A fixed date, so the output never changes.
    completedAt: new Date(0),
    tags,
  };
}

// ---------------------------------------------------------------------------
// The whole graph
// ---------------------------------------------------------------------------

// `picks` is what the visitor has chosen so far. Pass NO_PICKS (or anything
// incomplete) for the graph before they have chosen: the 40 invented people,
// no viewer, no top 5, no glitch match.
export function buildDemoGraph(picks: DemoPicks = NO_PICKS): DemoGraph {
  const hasViewer = arePicksComplete(picks);

  // --- Everyone who will be a dot ---
  const people: VisiblePerson[] = DEMO_COHORT.map((person) =>
    toVisiblePerson(
      person.id,
      person.alias,
      person.silhouette,
      person.course,
      [],
    ),
  );

  // Each person's tags in the formula's shape, by id.
  const tagsById = new Map<string, PersonTags>();
  for (const person of DEMO_COHORT) {
    tagsById.set(person.id, toPersonTags(person));
  }

  // The visitor's silhouette and course are not picked in the demo, so they
  // get a fixed silhouette and no course. No course means a neutral dot,
  // which is right: nobody asked which course they are on.
  if (hasViewer) {
    people.push(
      toVisiblePerson(VIEWER_ID, viewerAlias(picks), "silhouette-01", null, []),
    );
    tagsById.set(VIEWER_ID, toPersonTags(picks));
  }

  // --- Every pair's score, worked out with the real formula ---
  const edges: { userAId: string; userBId: string; score: number }[] = [];
  const ids = people.map((person) => person.userId);
  for (let first = 0; first < ids.length; first += 1) {
    for (let second = first + 1; second < ids.length; second += 1) {
      const a = tagsById.get(ids[first])!;
      const b = tagsById.get(ids[second])!;
      edges.push({
        userAId: ids[first],
        userBId: ids[second],
        score: calculateScore(a, b, PAIRINGS).score,
      });
    }
  }

  // --- Top 5 and glitch match (only when there is a viewer) ---
  let topFiveUserIds: string[] = [];
  const glitchMatches: { userId: string; matchedUserId: string }[] = [];

  if (hasViewer) {
    // The viewer's score with each demo person, best first. Ties go to the
    // lower id, a plain string comparison, so every phone agrees.
    const viewersScores = edges
      .filter(
        (edge) => edge.userAId === VIEWER_ID || edge.userBId === VIEWER_ID,
      )
      .map((edge) => ({
        userId: edge.userAId === VIEWER_ID ? edge.userBId : edge.userAId,
        score: edge.score,
      }))
      .sort((first, second) => {
        if (first.score !== second.score) {
          return second.score - first.score;
        }
        return first.userId < second.userId ? -1 : 1;
      });

    topFiveUserIds = viewersScores.slice(0, 5).map((entry) => entry.userId);

    // The glitch match: someone outside the top 5, picked by the hash. Sorted
    // by id first so the pick doesn't depend on the order of the list.
    const topFiveSet = new Set(topFiveUserIds);
    const options = DEMO_COHORT.map((person) => person.id)
      .filter((id) => !topFiveSet.has(id))
      .sort();
    if (options.length > 0) {
      glitchMatches.push({
        userId: VIEWER_ID,
        matchedUserId: options[hashOfPicks(picks) % options.length],
      });
    }
  }

  const graph = buildGraph({
    people,
    edges,
    glitchMatches,
    viewerId: hasViewer ? VIEWER_ID : "no-viewer",
    topFiveUserIds,
    matchingUserIds: null,
  });

  // --- The tap panel's extras, keyed by the node's id ---
  const details: Record<string, DemoPersonDetails> = {};
  const viewerTags = hasViewer ? tagsById.get(VIEWER_ID)! : null;

  for (const person of people) {
    const theirTags = tagsById.get(person.userId)!;
    const isViewer = person.userId === VIEWER_ID;

    // Rebuild the tag list from the ids so names always match the catalogue.
    const picksOfPerson: DemoPicks = {
      heroStory: theirTags.heroStory,
      energy: theirTags.energy,
      vibeDiagnosis: theirTags.vibeDiagnosis,
      qualities: theirTags.qualities,
      seeking: theirTags.seeking,
    };

    details[aliasToAddress(person.alias)] = {
      tagNames: tagNamesInCatalogueOrder(picksOfPerson),
      reasons:
        viewerTags && !isViewer
          ? explainScore(viewerTags, theirTags, PAIRINGS, TAG_NAMES).sentences
          : [],
    };
  }

  return { graph, details };
}
