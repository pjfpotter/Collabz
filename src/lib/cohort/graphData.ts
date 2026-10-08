// THE GRAPH'S DATA (slice 4, #11, design decisions 2 and 4).
//
// The /graph page shows every visible person as a dot (a "node") and every
// pair's score as a line between two dots (a "link"). This file works out
// that list of nodes and links ON THE SERVER. The browser only draws it.
//
// WHY THE SERVER DECIDES EVERYTHING: the drawing code (CohortGraph.tsx) runs
// inside a canvas, which no test can look into. So every rule ("is this one
// of your top 5?", "how thick is this line?") is decided here, where it can
// be tested, and the drawing code is left with nothing but "if this flag is
// set, draw it this way".
//
// WHAT MUST NEVER BE IN THE RESULT: an email or a database user id. Whatever
// a Server Component passes to a browser component can be read by anyone who
// opens dev tools. So a node's id is its ALIAS ADDRESS (see aliasAddress.ts),
// which is already public.
//
// The file has three parts:
//   1. edgeStyle()      - a score becomes a line thickness and faintness
//   2. buildGraph()     - people + scores become nodes + links (no database)
//   3. buildGraphData() - loads everything from the database for buildGraph()

import { prisma } from "@/lib/db";

import { aliasToAddress } from "./aliasAddress";
import { getTopFive } from "./standIns";
import { getVisiblePeople, type VisiblePerson } from "./visiblePeople";

// ---------------------------------------------------------------------------
// 1. edgeStyle
// ---------------------------------------------------------------------------

// How a line looks. THESE NUMBERS ARE TUNED BY EYE (task 4.4), against the
// pretend cohort and a made-up cohort of 100. If the graph looks like a
// hairball, or the weak lines vanish altogether, this is the one place to
// change. The screenshots they were tuned to are in
// openspec/changes/11-graph-search/screenshots/.
//
// Thickness is in pixels. Opacity runs from 0 (invisible) to 1 (solid).
export const MIN_EDGE_WIDTH = 0.5;
export const MAX_EDGE_WIDTH = 4;
export const MIN_EDGE_OPACITY = 0.04;
export const MAX_EDGE_OPACITY = 0.7;

// A bigger cohort has far more lines (30 people have 435, 100 have 4,950),
// and they all cross in the same space. Drawn at the same faintness they add
// up to a solid grey mass. So once there are more lines than
// UNCROWDED_LINE_COUNT, every line is made fainter in step, down to
// CROWDED_OPACITY_FLOOR of its normal value at the very most. Thickness is
// left alone, so the strongest lines still read as the thickest.
export const UNCROWDED_LINE_COUNT = 450;
export const CROWDED_OPACITY_FLOOR = 0.3;

export type EdgeStyle = {
  // The score as a fraction of the highest score: 0 (weakest) to 1
  // (strongest). The graph uses it for how hard two people are pulled
  // together, so good matches end up near each other.
  strength: number;
  width: number;
  opacity: number;
};

// Turns a score into how thick and how faint its line is drawn.
//
// The brief says thickness shows score. We also decided to draw EVERY line
// and make the weak ones faint, so the strong ones stand out without hiding
// anything (Patrick's decision, design 4).
//
// `maxScore` is the highest score anywhere in the cohort. The score is
// measured against that, not against a fixed number, because the real scores
// (slice 3) will have a different range from the pretend ones. This way the
// strongest line is always the thickest, whatever the range is.
//
// `lineCount` is how many lines the whole graph has. It only matters for a
// big cohort (see UNCROWDED_LINE_COUNT above), and can be left out.
export function edgeStyle(score: number, maxScore: number, lineCount = 0): EdgeStyle {
  // "strength" is the score as a fraction of the highest: 0 is the weakest a
  // line can be, 1 is the strongest.
  let strength = 0;
  if (maxScore > 0) {
    strength = score / maxScore;
  }
  // If maxScore is 0, every score is 0 and dividing would give "not a
  // number". Strength stays 0, so every line is drawn at its faintest.

  // Keep it between 0 and 1 even if a caller passes a negative score or one
  // above the maximum. Otherwise a line could come out wider than the limit.
  strength = Math.min(1, Math.max(0, strength));

  // How much the line stands out, also from 0 to 1. It is the strength
  // MULTIPLIED BY ITSELF TWICE, which keeps 0 and 1 where they are but pushes
  // everything in between down: half strength becomes an eighth. WHY: most
  // pairs have a middling score. Drawn in proportion, hundreds of middling
  // lines pile up into one dark blob and the few strong ones are lost. This
  // way middling lines stay faint and only the really strong ones are bold.
  // (Tuned by eye in task 4.4, like the four numbers above.)
  const emphasis = strength * strength * strength;

  // 1 for a graph that isn't crowded, smaller for one that is. The square
  // root makes it fall gently: four times the lines gives half the opacity.
  let crowding = 1;
  if (lineCount > UNCROWDED_LINE_COUNT) {
    crowding = Math.max(CROWDED_OPACITY_FLOOR, Math.sqrt(UNCROWDED_LINE_COUNT / lineCount));
  }

  return {
    strength,
    // Start at the minimum and add a share of the gap up to the maximum.
    width: MIN_EDGE_WIDTH + emphasis * (MAX_EDGE_WIDTH - MIN_EDGE_WIDTH),
    opacity: (MIN_EDGE_OPACITY + emphasis * (MAX_EDGE_OPACITY - MIN_EDGE_OPACITY)) * crowding,
  };
}

// ---------------------------------------------------------------------------
// 2. buildGraph
// ---------------------------------------------------------------------------

// One dot on the graph.
export type GraphNode = {
  // The person's alias address, e.g. "the-feral-sea-captain". NOT the
  // database id (see the top of this file).
  id: string;
  alias: string;
  silhouette: string;
  courseId: string | null;
  // The course's name, for the legend and the panel, so the browser doesn't
  // need its own copy of the course list.
  courseName: string | null;
  // The person looking at the graph.
  isViewer: boolean;
  // One of the viewer's five best matches.
  isTopFive: boolean;
  // The viewer's glitch match.
  isGlitch: boolean;
  // False when the people filters are on and this person doesn't fit them.
  // The graph dims these. True for everyone when no filter is on.
  matchesFilter: boolean;
  // This person's score with the viewer, for the panel. Null for the viewer's
  // own node, and for anyone the viewer has no stored score with.
  scoreWithViewer: number | null;
};

// One line on the graph.
export type GraphLink = {
  // The alias addresses of the two people it joins.
  source: string;
  target: string;
  score: number;
  // These three are worked out by edgeStyle(), so the drawing code doesn't
  // need the rule. See EdgeStyle above for what each one means.
  strength: number;
  width: number;
  opacity: number;
  // One of the two people is the other's glitch match. Drawn dashed. This is
  // true for EVERYONE's glitch matches, not only the viewer's.
  isGlitch: boolean;
  // Joins the viewer to one of their top 5 or to their glitch match. Drawn in
  // the highlight colour.
  isViewersMatch: boolean;
};

export type GraphData = {
  nodes: GraphNode[];
  links: GraphLink[];
  // The viewer's top 5 as nodes, best match first, for the list in words
  // under the graph (design 5).
  topFive: GraphNode[];
  // The viewer's glitch match, or null if they have none or it isn't visible.
  glitchMatch: GraphNode | null;
};

// Everything buildGraph() needs, already loaded. Passing it in, instead of
// loading it here, is what lets the tests run this without a database.
export type GraphInput = {
  people: VisiblePerson[];
  // Stored scores. Either end may be someone who isn't visible.
  edges: { userAId: string; userBId: string; score: number }[];
  // Every glitch match in the cohort: "userId's glitch match is matchedUserId".
  glitchMatches: { userId: string; matchedUserId: string }[];
  viewerId: string;
  // The viewer's top 5 as user ids, best first.
  topFiveUserIds: string[];
  // The user ids that fit the people filters, or null when no filter is on.
  matchingUserIds: Set<string> | null;
};

// Turns people and scores into nodes and links. A plain function: no
// database, nothing loaded, the same answer for the same input.
export function buildGraph(input: GraphInput): GraphData {
  // --- Lookups ---
  //
  // The input talks about people by database id, and the output must only
  // use alias addresses. This Map is the translation, and it does a second
  // job: an id that ISN'T in it belongs to someone who isn't visible.
  const addressByUserId = new Map<string, string>();
  for (const person of input.people) {
    addressByUserId.set(person.userId, aliasToAddress(person.alias));
  }

  const topFiveIds = new Set(input.topFiveUserIds);

  // The viewer's own glitch match, if they have one.
  const viewersGlitchId =
    input.glitchMatches.find((glitch) => glitch.userId === input.viewerId)?.matchedUserId ?? null;

  // Every glitch pair as one piece of text, "idA|idB", so that checking "is
  // this pair a glitch match?" is a single lookup. Both ways round are added
  // because A's glitch match being B is stored on A, but the link between
  // them may list B first.
  const glitchPairs = new Set<string>();
  for (const glitch of input.glitchMatches) {
    glitchPairs.add(`${glitch.userId}|${glitch.matchedUserId}`);
    glitchPairs.add(`${glitch.matchedUserId}|${glitch.userId}`);
  }

  // Each person's score with the viewer, for the panel.
  const scoreWithViewerByUserId = new Map<string, number>();
  for (const edge of input.edges) {
    if (edge.userAId === input.viewerId) {
      scoreWithViewerByUserId.set(edge.userBId, edge.score);
    } else if (edge.userBId === input.viewerId) {
      scoreWithViewerByUserId.set(edge.userAId, edge.score);
    }
  }

  // --- Nodes: one per visible person ---
  const nodeByUserId = new Map<string, GraphNode>();
  for (const person of input.people) {
    const isViewer = person.userId === input.viewerId;
    nodeByUserId.set(person.userId, {
      id: aliasToAddress(person.alias),
      alias: person.alias,
      silhouette: person.silhouette,
      courseId: person.courseId,
      courseName: person.courseName,
      isViewer,
      isTopFive: topFiveIds.has(person.userId),
      isGlitch: person.userId === viewersGlitchId,
      // No filter on (null) means everybody "matches".
      matchesFilter: input.matchingUserIds === null || input.matchingUserIds.has(person.userId),
      scoreWithViewer: isViewer ? null : (scoreWithViewerByUserId.get(person.userId) ?? null),
    });
  }

  // --- Links: one per stored score between two VISIBLE people ---
  //
  // A score to a suspended person is still in the database, but a line can't
  // be drawn to a dot that isn't there, so those are skipped.
  const visibleEdges = input.edges.filter(
    (edge) => addressByUserId.has(edge.userAId) && addressByUserId.has(edge.userBId),
  );

  // The highest score among the lines we will actually draw. edgeStyle()
  // measures every score against it.
  let maxScore = 0;
  for (const edge of visibleEdges) {
    maxScore = Math.max(maxScore, edge.score);
  }

  const links: GraphLink[] = visibleEdges.map((edge) => {
    // Which end, if either, is the viewer? `otherEndId` is then the person at
    // the far end of the viewer's line.
    let otherEndId: string | null = null;
    if (edge.userAId === input.viewerId) {
      otherEndId = edge.userBId;
    } else if (edge.userBId === input.viewerId) {
      otherEndId = edge.userAId;
    }

    const isViewersMatch =
      otherEndId !== null && (topFiveIds.has(otherEndId) || otherEndId === viewersGlitchId);

    return {
      // The `!` is safe: visibleEdges only kept edges whose two ends are both
      // in addressByUserId.
      source: addressByUserId.get(edge.userAId)!,
      target: addressByUserId.get(edge.userBId)!,
      score: edge.score,
      ...edgeStyle(edge.score, maxScore, visibleEdges.length),
      isGlitch: glitchPairs.has(`${edge.userAId}|${edge.userBId}`),
      isViewersMatch,
    };
  });

  // The graph library draws links in list order, so later ones land ON TOP of
  // earlier ones. Putting the viewer's matches last is what makes them sit
  // above the faint lines instead of under them (design 4). Number(false) is
  // 0 and Number(true) is 1, so this sorts "not mine" before "mine".
  links.sort((first, second) => Number(first.isViewersMatch) - Number(second.isViewersMatch));

  // --- The viewer's matches, for the list in words ---
  const topFive: GraphNode[] = [];
  for (const userId of input.topFiveUserIds) {
    const node = nodeByUserId.get(userId);
    // Skip anyone who isn't visible, so the list never names a hidden person.
    if (node) {
      topFive.push(node);
    }
  }
  const glitchMatch =
    viewersGlitchId === null ? null : (nodeByUserId.get(viewersGlitchId) ?? null);

  return {
    nodes: [...nodeByUserId.values()],
    links,
    topFive,
    glitchMatch,
  };
}

// ---------------------------------------------------------------------------
// 3. buildGraphData
// ---------------------------------------------------------------------------

// Loads everything the graph needs and builds it, for the person looking.
//
// `viewerId` is the signed-in user's database id. It is used to work out the
// flags and is not in the result.
//
// The people filters (course, skill, interest) are added by task 5.3. Until
// then no filter is on, so every node has matchesFilter: true.
export async function buildGraphData(viewerId: string): Promise<GraphData> {
  const people = await getVisiblePeople();

  // Every stored score and every glitch match in the cohort. Only the columns
  // the graph uses, so nothing else is carried around.
  const edges = await prisma.edge.findMany({
    select: { userAId: true, userBId: true, score: true },
  });
  const glitchMatches = await prisma.glitchMatch.findMany({
    select: { userId: true, matchedUserId: true },
  });

  const topFive = await getTopFive(viewerId);

  return buildGraph({
    people,
    edges,
    glitchMatches,
    viewerId,
    topFiveUserIds: topFive.map((match) => match.userId),
    matchingUserIds: null,
  });
}
