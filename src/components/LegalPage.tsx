// The shared look of the Terms & Conditions (/terms) and data policy
// (/privacy) pages (slice 1, #8, design decision 10).
//
// Both are long, plain text. This gives them a readable column, a title, the
// date they were last changed, and comfortable spacing for headings and
// lists, so the two pages can't drift apart in style.
//
// Owner: slice 1 (#8).

import type { ReactNode } from "react";

type LegalPageProps = {
  title: string;
  // e.g. "13 October 2026". Shown so readers can tell if it has changed.
  lastUpdated: string;
  children: ReactNode;
};

export function LegalPage({ title, lastUpdated, children }: LegalPageProps) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Last updated {lastUpdated}
      </p>

      {/* The [&_h2] style rules reach into the page's own content, so each
          page can be written as plain headings, paragraphs and lists. */}
      <div className="mt-6 leading-relaxed [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:mt-1 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6 [&_a]:underline [&_a]:underline-offset-4">
        {children}
      </div>
    </main>
  );
}
