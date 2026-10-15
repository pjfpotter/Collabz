// The page shown for any address that doesn't lead anywhere (slice 10, #45,
// design decision 8).
//
// Next.js shows this when a page can't be found AND when a page calls
// notFound(). The app calls notFound() on purpose for things a person
// mustn't know exist: a conversation that isn't theirs, an admin page for a
// member. So this one page must look the same for both, and say nothing
// that tells them apart. Its sentence is the same one Next.js showed
// before; only the look changed.

import { StateMessage } from "@/components/StateMessage";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="font-sans text-xs font-bold uppercase tracking-[0.08em] text-muted">404</h1>
      <div className="mt-2">
        <StateMessage title="This page could not be found." />
      </div>
    </main>
  );
}
