// A stand-in page for a route whose feature hasn't been built yet
// (foundation #7, design decision 10).
//
// Every planned route already has a page.tsx that shows one of these, so:
// - two tracks can't both invent the same address by accident, and
// - the nav bar has somewhere to go for every link from day one.
//
// IF THIS IS YOUR ROUTE: replace your page.tsx with the real page. Once the
// last placeholder is gone, this file can be deleted too.

type PlaceholderPageProps = {
  // The page's name, e.g. "Matches".
  title: string;
  // Which slice builds it, and that slice's GitHub issue, e.g. 3 and 10.
  slice: number;
  issue: number;
  // One sentence on what the finished page will do.
  willShow: string;
};

export function PlaceholderPage({ title, slice, issue, willShow }: PlaceholderPageProps) {
  return (
    // Same single narrow column as the home page and the catalogue.
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="text-3xl font-semibold">{title}</h1>

      <p className="mt-4 text-lg">{willShow}</p>

      <p className="mt-8 rounded border border-current/30 p-4 text-sm">
        <strong>This page is a placeholder.</strong> Slice {slice} (issue #{issue})
        will build it. If that&apos;s your track, replace this file with the real
        page.
      </p>
    </main>
  );
}
