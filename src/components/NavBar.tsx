// The navigation bar shown at the top of every page (foundation #7,
// design decision 11). It is used once, in src/app/layout.tsx.
//
// It links to every page in the route plan, so anyone can reach any part of
// the app from anywhere, and it holds the dev "sign in asÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦" switcher. The
// Requests link also shows how many connection requests are waiting for you.
//
// Sign-in and sign-up links are shown only without a real session. The
// account area then says "Signed in as …" and offers Sign out. Route access
// is still checked by each page; this only avoids confusing navigation.

import { getSessionUser } from "@/lib/auth/session";

import { DevUserSwitcher } from "@/components/DevUserSwitcher";
// The link row itself is a Client Component so it can highlight the current page.
import { NavLinks, type NavLinkItem } from "@/components/NavLinks";
// Slice 1 (#8): "Signed in as ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ / Sign out", or "Not signed in".
import { SignedInStatus } from "@/components/SignedInStatus";
// Read once on the server; the client uses the count in either layout.
import { findWaitingCount } from "@/components/WaitingRequestsCount";

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

export async function NavBar() {
  const [waitingCount, sessionUser] = await Promise.all([
    findWaitingCount(),
    getSessionUser(),
  ]);
  // A real session is the same source used by SignedInStatus, including an
  // account still finishing onboarding. Dev switcher identity is separate.
  const visibleLinks = sessionUser
    ? navLinks.filter((link) => link.href !== "/signin" && link.href !== "/signup")
    : navLinks;
  return (
    // bg-surface and border-line are the design tokens (globals.css), so the
    // bar follows the light and dark theme by itself.
    <header className="border-b border-line bg-surface">
      {/* The dev strip comes FIRST, above the real bar, so nobody mistakes it
          for product UI. It draws nothing where the pretend cohort is off
          (e.g. the live site). */}
      <DevUserSwitcher />

      <div className="mx-auto w-full max-w-7xl px-4 py-2">
        <NavLinks links={visibleLinks} waitingCount={waitingCount}
          accountStatus={<SignedInStatus />} />
      </div>
    </header>
  );
}
