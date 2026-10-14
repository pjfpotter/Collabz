// The navigation bar shown at the top of every page (foundation #7,
// design decision 11). It is used once, in src/app/layout.tsx.
//
// It links to every page in the route plan, so anyone can reach any part of
// the app from anywhere, and it holds the dev "sign in as…" switcher. The
// Requests link also shows how many connection requests are waiting for you.
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
// Slice 1 (#8): "Signed in as … / Sign out", or "Not signed in".
import { SignedInStatus } from "@/components/SignedInStatus";
// Slice 5 (#12): the number of requests waiting for you, beside the Requests link.
import { WaitingRequestsCount } from "@/components/WaitingRequestsCount";

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
    // bg-surface and border-line are the design tokens (globals.css), so the
    // bar follows the light and dark theme by itself.
    <header className="border-b border-line bg-surface">
      {/* The dev strip comes FIRST, above the real bar, so nobody mistakes it
          for product UI. It draws nothing where the pretend cohort is off
          (e.g. the live site). */}
      <DevUserSwitcher />

      <div className="mx-auto w-full max-w-5xl px-4 py-2">
        {/* aria-label names this set of links for screen readers. */}
        <nav
          aria-label="Main"
          // flex-wrap is what makes this work on a phone: when the links
          // don't fit on one line they carry on underneath, instead of
          // pushing the page wider than the screen. EVERY link stays here,
          // because the app-navigation spec says the bar links to each page
          // (the design's smaller tab set was not adopted).
          className="flex flex-wrap items-center gap-x-1 gap-y-1"
        >
          {/* The wordmark: "Collab" in the display face and an italic "z",
              the one mischievous letter (brand board). The two parts sit in
              ONE inner span: the link is a flex box, and flex would treat
              them as separate items, so a screen reader would read
              "Collab z" instead of "Collabz". */}
          <Link
            href="/"
            className={`${linkShape} mr-2 font-display text-2xl leading-none`}
          >
            <span>
              Collab<span className="italic text-primary-text">z</span>
            </span>
          </Link>

          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${linkShape} text-sm font-medium`}
            >
              {link.label}
              {/* Only the Requests link carries a count. It draws nothing
                  when you are signed out or nothing is waiting. */}
              {link.href === "/requests" && <WaitingRequestsCount />}
            </Link>
          ))}
        </nav>

        {/* Slice 1 (#8): the real sign-in state, with a Sign out button. */}
        <div className="mt-1">
          <SignedInStatus />
        </div>
      </div>
    </header>
  );
}

// What every link in the bar shares:
// - min-h-11 and min-w-11 are 44px, the smallest comfortable touch target
//   (visual-design spec "Every screen works at phone width first");
// - rounded-control and hover:bg-surface-2 give the soft tab look;
// - the focus-visible outline is the keyboard focus ring: it only shows for
//   keyboard users, in the readable accent colour.
const linkShape =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-control px-3 " +
  "hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-primary-text";
