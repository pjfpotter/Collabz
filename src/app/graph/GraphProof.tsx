"use client";

// TEMPORARY (slice 4, #11, task 1.3). Task 4.1 deletes this file and puts the
// real graph, CohortGraph.tsx, in its place.
//
// This only exists to PROVE that the graph library works inside our app
// before we build on it. The library is older than React 19 and Next.js 16
// (design.md, Risks), so we draw three dots and two lines and check that
// nothing breaks.
//
// "use client" at the top makes this a Client Component: it runs in the
// browser. It has to, because the library draws on a <canvas>, and a canvas
// only exists in a browser.

import ForceGraph2D from "react-force-graph-2d";

// Three made-up people and the two lines between them. The library wants
// "nodes" (the dots) and "links" (the lines), and a link names the ids of the
// two nodes it joins.
const proofData = {
  nodes: [{ id: "first" }, { id: "second" }, { id: "third" }],
  links: [
    { source: "first", target: "second" },
    { source: "second", target: "third" },
  ],
};

export default function GraphProof() {
  return (
    <ForceGraph2D
      graphData={proofData}
      width={320}
      height={240}
      // Bigger than the default, so the dots are easy to see in a small box.
      nodeRelSize={8}
      // Fixed colours that show up in both light and dark mode. The real
      // graph picks its colours properly (design 4).
      nodeColor={() => "#2563eb"}
      linkColor={() => "#9ca3af"}
      linkWidth={2}
    />
  );
}
