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

import { DevUserSwitcher } from "@/components/DevUserSwitcher";
// The link row itself is a Client Component so it can highlight the current page.
import { NavLinks, type NavLinkItem } from "@/components/NavLinks";
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
const navLinks: NavLinkItem[] = [
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

      {/* max-w-7xl (1280px) so all twelve links fit on one row on a desktop.
          On a phone the row wraps instead (see NavLinks). The sign-in status
          shares the row: ml-auto pushes it to the right when there is room,
          and it drops underneath when there is not. */}
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-4 px-4 py-2">
        <NavLinks
          links={navLinks.map((link) => ({
            ...link,
            // Only the Requests link carries a count. It draws nothing when
            // you are signed out or nothing is waiting.
            badge: link.href === "/requests" ? <WaitingRequestsCount /> : undefined,
          }))}
        />

        {/* Slice 1 (#8): the real sign-in state, with a Sign out button. */}
        <div className="ml-auto">
          <SignedInStatus />
        </div>
      </div>
    </header>
  );
}
