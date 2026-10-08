// /graph - PLACEHOLDER (foundation #7).
// Owner: slice 4, issue #11 (track 4). Replace this file with the real page.

import { PlaceholderPage } from "@/components/PlaceholderPage";

import { GraphProofLoader } from "./GraphProofLoader";

// Sets the browser tab title for this page.
export const metadata = {
  title: "Graph · Collabz",
};

export default function GraphPage() {
  return (
    <>
      <PlaceholderPage
        title="Graph"
        slice={4}
        issue={11}
        willShow="The whole cohort as a graph, with a line for every pair's score."
      />
      {/* TEMPORARY (task 1.3): three dots and two lines, to prove the graph
          library works in our app. Task 4.1 replaces it with the real graph. */}
      <GraphProofLoader />
    </>
  );
}
