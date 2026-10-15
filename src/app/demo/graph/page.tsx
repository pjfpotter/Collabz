// /demo/graph - a public, phone-friendly demo of the cohort graph
// (graph-demo, group 4).
//
// WHAT IT IS FOR: fellow students scan a QR code, land here with no account,
// and play with the graph: tap and drag the dots, and pick a few tags to see
// where they would sit.
//
// WHAT IT DOES NOT DO: it never reads the database, never needs a sign-in and
// never depends on the dev-only pretend cohort. Everyone on the graph is
// invented (src/lib/graphDemo/demoCohort.ts) and nothing the visitor picks is
// saved. So it is safe on the live site.
//
// This file is a Server Component and only holds the words. The playing part
// (the picks, the re-scoring, the graph) needs the browser, so it is in
// DemoGraphClient.tsx.

import Link from "next/link";

import { textLinkClasses } from "@/components/formStyles";

import { DemoGraphClient } from "./DemoGraphClient";

// Sets the browser tab title for this page.
export const metadata = {
  title: "Try the graph · Collabz",
};

export default function DemoGraphPage() {
  return (
    // Same widths as the real /graph page, so the two feel like one product.
    <main className="mx-auto w-full max-w-3xl px-4 py-8 lg:max-w-6xl">
      <h1 className="text-4xl">Try the graph</h1>

      <p className="mt-2 text-muted">
        This is Collabz&apos;s cohort graph, with 40 made-up people. Tap a dot to see who it is, or
        pull it to move it. Drag the background to move around, and pinch to zoom.
      </p>
      <p className="mt-2 text-muted">
        Want to see where <em>you</em> would sit? Open &ldquo;Be someone&rdquo; and pick a few
        tags. Nothing you pick is saved.
      </p>

      <DemoGraphClient />

      <p className="mt-8">
        Like what you see?{" "}
        <Link href="/signup" className={textLinkClasses}>
          Sign up for the real thing
        </Link>
        .
      </p>
    </main>
  );
}
