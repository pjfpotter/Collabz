// The navigation bar shown at the top of every page (foundation #7,
// design decision 11). It is used once, in src/app/layout.tsx.
//
// It links to every page in the route plan, so anyone can reach any part of
// the app from anywhere, and it holds the dev "sign in as…" switcher.
//
// FOR NOW IT SHOWS EVERY LINK TO EVERYONE, including Admin. That is on
// purpose: while we build, we all need to reach every page quickly. Hiding
// links depending on who is signed in (no Admin link for members, no Sign in
// link once you're signed in) is tidied up at join-up (#17), once real
// sign-in exists. The admin PAGES are already protected by requireAdmin();
// only the link is visible.

// Next.js's <Link> moves between pages without a full page reload.
import Link from "next/link";

import { DevUserSwitcher } from "@/components/DevUserSwitcher";

// THE ROUTE PLAN: every page that can be opened without choosing a person,
// in the order a new student meets them. (/people/[alias] isn't here because
// it needs a person's alias in the address.)
//
// Each route belongs to one slice. The full table, with owners, is in the
// README under "Routes". If you add a page, add it here too.
const navLinks = [
  { href: "/catalogue", label: "Catalogue" }, // slice 0
  { href: "/signup", label: "Sign up" }, // slice 1
  { href: "/signin", label: "Sign in" }, // slice 1
  { href: "/onboarding", label: "Onboarding" }, // slice 2
  { href: "/matches", label: "Matches" }, // slice 3
  { href: "/graph", label: "Graph" }, // slice 4
  { href: "/people", label: "People" }, // slice 4
  { href: "/requests", label: "Requests" }, // slice 5
  { href: "/messages", label: "Messages" }, // slice 6
  { href: "/account", label: "Account" }, // slice 7
  { href: "/admin", label: "Admin" }, // slice 8
  { href: "/admin/reports", label: "Reports" }, // slice 9
];

export function NavBar() {
  return (
    <header className="border-b border-current/20 px-4 py-3">
      {/* aria-label names this set of links for screen readers. */}
      <nav
        aria-label="Main"
        // flex-wrap is what makes this work on a phone: when the links don't
        // fit on one line they carry on underneath, instead of pushing the
        // page wider than the screen. gap-x/gap-y space them out in both
        // directions, and py-1 gives each link a taller area to tap.
        className="flex flex-wrap items-center gap-x-4 gap-y-1"
      >
        <Link href="/" className="py-1 text-lg font-semibold">
          Collabz
        </Link>

        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="py-1 text-sm underline underline-offset-4"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Draws nothing where the pretend cohort is off (e.g. the live site). */}
      <div className="mt-2">
        <DevUserSwitcher />
      </div>
    </header>
  );
}
