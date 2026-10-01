// The public tag catalogue at /catalogue: every category with its tags and
// descriptions, read from the database. No sign-in needed.
//
// This is a Server Component (the App Router default): it runs on the server,
// queries the database directly, and sends finished HTML to the browser. No
// API route is needed because the browser never sends anything here
// (design decision 2).

import Link from "next/link";

import { getCatalogue } from "@/lib/catalogue";

// Render this page fresh on every request.
// Without this, Next.js would build the page ONCE at build time and serve that
// copy forever, so a tag renamed or retired in the database would never show
// up (design decision 3). The query takes a few milliseconds, so this is cheap.
// Note: this setting belongs to Next.js's standard caching model. If we ever
// switch on the newer "Cache Components" option in next.config.ts, it has to
// be replaced (see node_modules/next/dist/docs, "route segment config").
export const dynamic = "force-dynamic";

// Sets the browser tab title for this page.
export const metadata = {
  title: "Tag catalogue · Collabz",
};

export default async function CataloguePage() {
  const catalogue = await getCatalogue();

  return (
    // Single narrow column, designed for a phone first (design decision 10):
    // max-w-md stops lines getting too long on a laptop, px-4 keeps text off
    // the screen edges on a phone.
    <main className="mx-auto w-full max-w-md px-4 py-8">
      <p>
        <Link href="/" className="text-sm underline underline-offset-4">
          ← Collabz
        </Link>
      </p>

      <h1 className="mt-4 text-3xl font-semibold">Tag catalogue</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Every tag you can pick to build a Collabz profile.
      </p>

      {/* One section per category: its name as a heading, then its tags. */}
      {catalogue.map((category) => (
        <section key={category.id} className="mt-10">
          <h2 className="text-xl font-semibold">{category.name}</h2>

          <ul className="mt-3 space-y-4">
            {category.tags.map((tag) => (
              <li key={tag.id}>
                <p className="font-medium">{tag.name}</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {tag.description}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
