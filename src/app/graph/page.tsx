// /graph - the whole cohort as a graph (slice 4, #11, design decisions 2
// and 5).
//
// This is a Server Component: it runs on the server for each visit. It works
// out the graph's data there and hands the finished list of dots and lines to
// the browser to draw. There is no API route in between, because the page
// needs the data exactly once, when it loads (the same approach as
// /catalogue).
//
// The page shows the same information three ways, on purpose:
//   1. the graph, for people who can see it;
//   2. a legend that says in words what each colour and shape means;
//   3. "Your top 5" and "Your glitch match" as ordinary links.
// A canvas is one opaque picture to a screen reader, and on a small phone a
// list is quicker than hunting for a highlighted dot. The links are also how
// the browser tests check the highlights, since a test can't see inside a
// canvas either.

import Link from "next/link";

import { buildGraphData, type GraphNode } from "@/lib/cohort/graphData";
import { requireFinishedProfile } from "@/lib/cohort/standIns";

import { CohortGraphLoader } from "./CohortGraphLoader";
import { courseColourName } from "./graphColours";
import styles from "./graphColours.module.css";

// Sets the browser tab title for this page.
export const metadata = {
  title: "Graph · Collabz",
};

export default async function GraphPage() {
  // Not signed in -> /signin. No finished profile -> /onboarding. Both stop
  // the page right here, so nothing below runs for them.
  const viewer = await requireFinishedProfile();

  const graph = await buildGraphData(viewer.id);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-semibold">Graph</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Everyone in the cohort, with a line for every pair&apos;s score. Tap a
        dot to see who it is, or pull it to move it. Drag the background to
        move around, and pinch to zoom.
      </p>

      <GraphLegend nodes={graph.nodes} />

      {/* The two data- attributes put the counts where a test (or a curious
          person in dev tools) can read them, because nothing inside the
          canvas can be counted from outside. */}
      <div
        className="mt-4 rounded border border-current/30"
        data-testid="cohort-graph"
        data-node-count={graph.nodes.length}
        data-edge-count={graph.links.length}
      >
        {/* Only the dots and lines are sent to the browser. Both lists were
            built without any email or database id (see graphData.ts). */}
        <CohortGraphLoader nodes={graph.nodes} links={graph.links} />
      </div>

      <section className="mt-8" aria-labelledby="top-five-heading">
        <h2 id="top-five-heading" className="text-xl font-semibold">
          Your top 5
        </h2>
        {graph.topFive.length === 0 ? (
          <p className="mt-2">You don&apos;t have any matches yet.</p>
        ) : (
          // <ol> is a NUMBERED list: the order means something here (best
          // match first).
          <ol className="mt-2 list-decimal space-y-1 pl-6" data-testid="top-five-list">
            {graph.topFive.map((person) => (
              <li key={person.id}>
                <PersonLink person={person} />
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="mt-8" aria-labelledby="glitch-heading">
        <h2 id="glitch-heading" className="text-xl font-semibold">
          Your glitch match
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          One person picked at random from outside your top 5.
        </p>
        {graph.glitchMatch === null ? (
          <p className="mt-2">You don&apos;t have a glitch match yet.</p>
        ) : (
          <p className="mt-2" data-testid="glitch-match">
            <PersonLink person={graph.glitchMatch} />
          </p>
        )}
      </section>
    </main>
  );
}

// A link to someone's profile, with their course and their score with you.
function PersonLink({ person }: { person: GraphNode }) {
  return (
    <>
      {/* A node's id is its profile address (see aliasAddress.ts). */}
      <Link href={`/people/${person.id}`} className="underline underline-offset-4">
        {person.alias}
      </Link>
      <span className="text-sm text-zinc-600 dark:text-zinc-400">
        {" "}
        · {person.courseName ?? "No course"}
        {person.scoreWithViewer !== null && ` · score ${person.scoreWithViewer}`}
      </span>
    </>
  );
}

// Says in words what each colour and shape on the graph means, so nothing
// depends on being able to tell two colours apart.
function GraphLegend({ nodes }: { nodes: GraphNode[] }) {
  // The courses that actually appear on the graph, each once, in A to Z
  // order. A Map keeps one entry per course id however many people share it.
  const courseNameById = new Map<string, string>();
  for (const node of nodes) {
    if (node.courseId !== null && node.courseName !== null) {
      courseNameById.set(node.courseId, node.courseName);
    }
  }
  const courses = [...courseNameById.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((first, second) => first.name.localeCompare(second.name));

  return (
    // The colours class makes the --graph-... colour names available to
    // everything inside (see graphColours.module.css).
    <ul
      className={`${styles.graphColours} mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm`}
      aria-label="What the graph's colours and shapes mean"
      data-testid="graph-legend"
    >
      {courses.map((course) => (
        <li key={course.id} className="flex items-center gap-2">
          <LegendDot fill={`var(${courseColourName(course.id)})`} />
          {course.name}
        </li>
      ))}
      <li className="flex items-center gap-2">
        <LegendDot ring="var(--graph-line)" />
        You
      </li>
      <li className="flex items-center gap-2">
        <LegendDot ring="var(--graph-highlight)" />
        Your top 5
      </li>
      <li className="flex items-center gap-2">
        <LegendDot ring="var(--graph-glitch)" dashed />
        Your glitch match
      </li>
      <li className="flex items-center gap-2">
        <LegendLine />
        Thicker line, higher score
      </li>
      <li className="flex items-center gap-2">
        <LegendLine dashed />
        Dashed line, a glitch match
      </li>
    </ul>
  );
}

type LegendDotProps = {
  // The dot's colour. Left out for the entries that are about the RING.
  fill?: string;
  // The ring's colour. Left out for the entries that are about the dot.
  ring?: string;
  dashed?: boolean;
};

// A small dot, drawn the way the graph draws one. `aria-hidden` hides it from
// screen readers: the words next to it say everything.
function LegendDot({ fill, ring, dashed = false }: LegendDotProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      {/* With no fill of its own, the dot is a neutral grey so the ring is
          what stands out. */}
      <circle cx="10" cy="10" r="5" fill={fill ?? "var(--graph-other-course)"} />
      {ring && (
        <circle
          cx="10"
          cy="10"
          r="8"
          fill="none"
          stroke={ring}
          strokeWidth="2"
          strokeDasharray={dashed ? "4 3" : undefined}
        />
      )}
    </svg>
  );
}

// A short line, solid or dashed.
function LegendLine({ dashed = false }: { dashed?: boolean }) {
  return (
    <svg width="28" height="20" viewBox="0 0 28 20" aria-hidden="true">
      <line
        x1="2"
        y1="10"
        x2="26"
        y2="10"
        stroke="var(--graph-line)"
        strokeWidth={dashed ? 2 : 3}
        strokeDasharray={dashed ? "4 3" : undefined}
      />
    </svg>
  );
}
