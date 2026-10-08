"use client";

// TEMPORARY (slice 4, #11, task 1.3). Task 4.1 replaces this file with
// CohortGraphLoader.tsx, which does the same job for the real graph.
//
// Loads GraphProof in the browser only.
//
// WHY THIS TINY FILE EXISTS: the graph library reads the window and draws on
// a canvas, and neither exists on the server. `ssr: false` tells Next.js
// "don't try to build this on the server, wait for the browser". Next.js 16
// only allows `ssr: false` inside a Client Component (checked in
// node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md), so it can't
// go in page.tsx, which is a Server Component. This file is the smallest
// Client Component that can hold it.

import dynamic from "next/dynamic";

const GraphProof = dynamic(() => import("./GraphProof"), {
  ssr: false,
  // Shown for the moment between the page arriving and the library loading.
  loading: () => <p>Loading the graph…</p>,
});

export function GraphProofLoader() {
  return <GraphProof />;
}
