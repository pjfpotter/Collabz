"use client";

// THE PLAYABLE PART OF THE GRAPH DEMO (graph-demo, group 4).
//
// Holds what the visitor has picked, re-scores everyone against it, and draws
// the result with the REAL graph component.
//
// "use client" because it keeps state in the browser (the picks) and the
// graph library draws on a canvas. Re-scoring happens right here, in the
// browser, so a tap feels instant on a phone with a poor signal (design
// decision 3). There is no server call and no API route.
//
// THERE ARE NO SCORING RULES IN THIS FILE. They all live in
// src/lib/graphDemo/buildDemoGraph.ts, which is plain, tested code. This file
// only collects picks and draws what comes back.

import { useMemo, useState, type FormEvent } from "react";

import { CohortGraphLoader } from "@/app/graph/CohortGraphLoader";
import styles from "@/app/graph/graphColours.module.css";
import { CourseMark } from "@/components/CourseMark";
import { OptionCard } from "@/components/OptionCard";
import { secondaryButtonClasses } from "@/components/formStyles";
import {
  arePicksComplete,
  buildDemoGraph,
  NO_PICKS,
  PICK_CATEGORIES,
  type DemoPicks,
} from "@/lib/graphDemo/buildDemoGraph";
// The same catalogue onboarding uses, so the demo offers exactly what the real
// app offers, with the same pick limits (design decision 7).
import { seedCategories } from "../../../../prisma/seed-data";

// The categories the picker shows, in the order the score uses them, each with
// the catalogue's own name and limits.
const PICKER_CATEGORIES = PICK_CATEGORIES.flatMap(({ field, categoryId }) => {
  const category = seedCategories.find((candidate) => candidate.id === categoryId);
  return category ? [{ field, category }] : [];
});

export function DemoGraphClient() {
  const [picks, setPicks] = useState<DemoPicks>(NO_PICKS);
  // Changing this remounts the form, which is how "Start again" clears every
  // tick: the checkboxes are uncontrolled (OptionCard only takes a starting
  // value), so a new key is the clean way to reset them.
  const [formKey, setFormKey] = useState(0);

  // Re-scored only when the picks change. useMemo means "reuse the last
  // answer unless these inputs changed", so opening the panel or dragging a
  // dot doesn't re-score 40 people.
  const demo = useMemo(() => buildDemoGraph(picks), [picks]);
  const graph = demo.graph;
  const hasViewer = arePicksComplete(picks);

  // Read every ticked box in the form each time anything changes. The form is
  // the one source of truth for what is ticked (OptionCard is uncontrolled),
  // so we read it rather than trying to track each click.
  function readPicks(event: FormEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget);
    const next: DemoPicks = { ...NO_PICKS };
    for (const { field } of PICKER_CATEGORIES) {
      next[field] = data.getAll(field).map(String);
    }
    setPicks(next);
  }

  // The graph keeps its own copy of the nodes once it starts, so it has to be
  // started again when the data changes. A different `key` tells React "this
  // is a new component" (the same trick /graph uses for its filters). Only
  // COMPLETE picks change the graph, so half-finished picks don't restart it.
  const graphKey = hasViewer ? JSON.stringify(picks) : "no-viewer";

  return (
    <>
      {/* ---- The picker. Closed by default so the graph comes first on a
          phone; <details> is a built-in open/close with no JavaScript. ---- */}
      <details className="mt-6 rounded-feature border border-line bg-surface p-4">
        <summary className="cursor-pointer text-xl font-semibold">
          Be someone: pick your tags
        </summary>

        <form key={formKey} onChange={readPicks} className="mt-4 space-y-6" data-testid="demo-picker">
          {PICKER_CATEGORIES.map(({ field, category }) => {
            const single = category.pickMax === 1;
            const pickedCount = picks[field].length;
            const atLimit = pickedCount >= category.pickMax;

            return (
              <fieldset key={field}>
                <legend className="text-lg font-semibold">{category.name}</legend>
                <p className="mt-1 text-sm text-muted">
                  {single ? "Pick 1." : `Pick 1 to ${category.pickMax}.`}
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {category.tags.map((tag) => (
                    <OptionCard
                      key={tag.id}
                      // Radio buttons for "pick 1", checkboxes for "pick up
                      // to 4". The same name groups the radios.
                      type={single ? "radio" : "checkbox"}
                      name={field}
                      value={tag.id}
                      title={tag.name}
                      // Once the limit is reached, only the UNTICKED ones are
                      // switched off, so a person can still untick one to
                      // swap. (Radios never need this: picking another one
                      // replaces the first.)
                      disabled={!single && atLimit && !picks[field].includes(tag.id)}
                      disabledNote="Limit reached. Let one go first."
                    />
                  ))}
                </div>
              </fieldset>
            );
          })}

          <button
            type="button"
            className={secondaryButtonClasses}
            onClick={() => {
              setPicks(NO_PICKS);
              setFormKey((key) => key + 1);
            }}
          >
            Start again
          </button>
        </form>
      </details>

      <p className="mt-4 text-sm text-muted" data-testid="demo-status">
        {hasViewer
          ? "You are on the graph now. Your top 5 and one glitch match are highlighted."
          : "Pick at least one tag in every group to put yourself on the graph."}
      </p>

      {/* ---- The graph itself, the real component ---- */}
      <div
        className="mt-4 overflow-hidden rounded-feature border border-line bg-surface"
        data-testid="demo-graph"
        data-node-count={graph.nodes.length}
        data-edge-count={graph.links.length}
      >
        <CohortGraphLoader
          key={graphKey}
          nodes={graph.nodes}
          links={graph.links}
          // The invented people have no profile page to open.
          showProfileLinks={false}
          panelDetails={demo.details}
        />
      </div>

      {/* ---- The legend, in words (a canvas tells a screen reader nothing).
          BELOW the graph, so on a phone the graph is nearer the top. ---- */}
      <ul
        className={`${styles.graphColours} mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm`}
        aria-label="What the graph's colours and shapes mean"
      >
        <li>
          <CourseMark courseId="software" name="Software" variant="plain" />
        </li>
        <li>
          <CourseMark courseId="business" name="Business" variant="plain" />
        </li>
        {hasViewer && <li>Bright lines: your top 5. Dashed line: your glitch match.</li>}
      </ul>

      {/* ---- The same highlights as a list, as /graph does ---- */}
      {hasViewer && (
        <>
          <section className="mt-8" aria-labelledby="demo-top-five-heading">
            <h2 id="demo-top-five-heading" className="text-3xl">
              Your top 5
            </h2>
            <ol className="mt-2 list-decimal space-y-1 pl-6" data-testid="demo-top-five">
              {graph.topFive.map((person) => (
                <li key={person.id}>
                  {person.alias}
                  {person.scoreWithViewer !== null && (
                    <span className="text-muted"> · score {person.scoreWithViewer}</span>
                  )}
                </li>
              ))}
            </ol>
          </section>

          {graph.glitchMatch && (
            <section className="mt-8" aria-labelledby="demo-glitch-heading">
              <h2 id="demo-glitch-heading" className="text-3xl">
                Your glitch match
              </h2>
              <p className="mt-1 text-sm text-muted">
                One person from outside your top 5, as a surprise.
              </p>
              <p className="mt-2" data-testid="demo-glitch">
                {graph.glitchMatch.alias}
              </p>
            </section>
          )}
        </>
      )}
    </>
  );
}
