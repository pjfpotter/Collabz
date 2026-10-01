// The home page ("/").
// For slice 0 it only needs to prove the app runs and point people to the
// catalogue. Later slices (sign-in, onboarding) will replace this.

// Next.js's <Link> is used instead of a plain <a> because it moves between
// pages inside the app without a full page reload.
import Link from "next/link";

export default function Home() {
  return (
    // Single narrow column, phone-first (design decision 10):
    // max-w-md keeps lines short on wide screens, px-4 leaves a gap at the
    // edges on a phone.
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="text-3xl font-semibold">Collabz</h1>

      <p className="mt-4 text-lg">
        Find people to work with by chemistry, not CVs.
      </p>

      <p className="mt-8">
        <Link
          href="/catalogue"
          className="font-medium underline underline-offset-4"
        >
          See the tag catalogue
        </Link>
      </p>
    </main>
  );
}
