// THE GRAPH'S DATA (slice 4, #11, design decisions 2 and 4).
//
// The /graph page shows every visible person as a dot (a "node") and every
// pair's score as a line between two dots (a "link"). This file LOADS what
// the graph needs from the database and hands it to buildGraph(), which works
// out the list of nodes and links ON THE SERVER. The browser only draws it.
//
// graph-demo (task 2.1): edgeStyle(), buildGraph() and the graph types now
// live in graphShape.ts, which has no database in it, so that the public demo
// page can use them in the browser. They are re-exported below, so every
// existing "from graphData" import keeps working unchanged.
//
// WHY THE SERVER DECIDES EVERYTHING: the drawing code (CohortGraph.tsx) runs
// inside a canvas, which no test can look into. So every rule ("is this one
// of your top 5?", "how thick is this line?") is decided on the server, where
// it can be tested, and the drawing code is left with nothing but "if this
// flag is set, draw it this way".
//
// WHAT MUST NEVER BE IN THE RESULT: an email or a database user id. See
// graphShape.ts.

import { prisma } from "@/lib/db";

import { filterPeople, hasAnyFilter, type PeopleFilters } from "./search";
import { getHiddenUserIds } from "@/lib/safety/hiddenPeople";

import { buildGraph, type GraphData } from "./graphShape";
import { getTopFive } from "./standIns";
import { getVisiblePeople } from "./visiblePeople";

// Re-exports: the old home of these names. Values first, then types.
export {
  MIN_EDGE_WIDTH,
  MAX_EDGE_WIDTH,
  MIN_EDGE_OPACITY,
  MAX_EDGE_OPACITY,
  UNCROWDED_LINE_COUNT,
  CROWDED_OPACITY_FLOOR,
  edgeStyle,
  buildGraph,
} from "./graphShape";
export type { EdgeStyle, GraphNode, GraphLink, GraphData, GraphInput } from "./graphShape";

// ---------------------------------------------------------------------------
// 3. buildGraphData
// ---------------------------------------------------------------------------

// Loads everything the graph needs and builds it, for the person looking.
//
// `viewerId` is the signed-in user's database id. It is used to work out the
// flags and is not in the result.
//
// `filters` are the people filters from the page address (course, skill,
// interest), the same ones /people uses. On the graph a filter never REMOVES
// anyone: people who don't fit are still drawn, just dimmed, so the shape of
// the cohort stays the same. Leave it out for no filtering.
export async function buildGraphData(
  viewerId: string,
  filters?: PeopleFilters,
): Promise<GraphData> {
  // Slice 9 (#16): people who blocked the viewer, or were blocked by them,
  // are not drawn at all. buildGraph already skips edges to anyone missing
  // from `people`, so their lines go too.
  const hiddenIds = await getHiddenUserIds(viewerId);
  const people = (await getVisiblePeople()).filter((person) => !hiddenIds.has(person.userId));

  // The ids of the people who fit the filters, or null for "no filter on,
  // everyone fits". filterPeople is the same function /people uses, so the
  // list and the graph can't disagree about who matches.
  let matchingUserIds: Set<string> | null = null;
  if (filters && hasAnyFilter(filters)) {
    matchingUserIds = new Set(filterPeople(people, filters).map((person) => person.userId));
  }

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
    matchingUserIds,
  });
}
