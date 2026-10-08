"use client";

// Loads the graph in the browser only (slice 4, #11, design decision 3).
//
// WHY THIS TINY FILE EXISTS: the graph library reads the window and draws on
// a canvas, and neither exists on the server. `ssr: false` tells Next.js
// "don't try to build this on the server, wait for the browser". Next.js 16
// only allows `ssr: false` inside a Client Component (checked in
// node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md), so it can't
// go in page.tsx, which is a Server Component. This file is the smallest
// Client Component that can hold it, and it keeps the page itself on the
// server.
//
// A second benefit: `dynamic` puts the graph library in its own download,
// which the browser only fetches on this page. Nobody pays for it elsewhere.

import dynamic from "next/dynamic";

import type { GraphLink, GraphNode } from "@/lib/cohort/graphData";

const CohortGraph = dynamic(() => import("./CohortGraph"), {
  ssr: false,
  // Shown for the moment between the page arriving and the library loading.
  loading: () => <p className="p-4">Loading the graph…</p>,
});

type CohortGraphLoaderProps = {
  nodes: GraphNode[];
  links: GraphLink[];
};

// Passes the data straight through to the real graph.
export function CohortGraphLoader({ nodes, links }: CohortGraphLoaderProps) {
  return <CohortGraph nodes={nodes} links={links} />;
}
