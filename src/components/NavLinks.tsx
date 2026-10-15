"use client";

// The row of links inside the nav bar, with the current page highlighted
// (slice 10, #45, task 10.1).
//
// WHY A CLIENT COMPONENT: knowing which page you are on needs the browser's
// current address, and only a Client Component can read it (usePathname).
// NavBar stays a Server Component, because the sign-in status and the
// waiting-requests count it shows are fetched on the server; those are passed
// in here as ready-made pieces (`badge`) rather than fetched here.

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export type NavLinkItem = {
  href: string;
  label: string;
  // Something shown after the label, e.g. the waiting-requests count.
  badge?: ReactNode;
};

// What every link in the bar shares:
// - min-h-11 and min-w-11 are 44px, the smallest comfortable touch target
//   (visual-design spec "Every screen works at phone width first");
// - rounded-control gives the soft tab look;
// - the focus-visible outline is the keyboard focus ring: it only shows for
//   keyboard users, in the readable accent colour.
const linkShape =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-control px-3 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-text";

// The current page gets the pill (surface-2 fill, accent text). The accent
// text colour is not the only signal: the fill and the bolder weight change
// too, and aria-current tells screen readers.
const currentLook = "bg-surface-2 font-semibold text-primary-text";
const otherLook = "font-medium hover:bg-surface-2";

// Picks which link is "the current page". The LONGEST matching address wins,
// so on /admin/reports only Reports is lit, not Admin as well.
function findCurrentHref(pathname: string, links: NavLinkItem[]): string | null {
  let best: string | null = null;
  for (const link of links) {
    const matches = pathname === link.href || pathname.startsWith(link.href + "/");
    if (matches && (best === null || link.href.length > best.length)) {
      best = link.href;
    }
  }
  return best;
}

export function NavLinks({ links }: { links: NavLinkItem[] }) {
  const pathname = usePathname();
  const currentHref = findCurrentHref(pathname, links);

  return (
    // aria-label names this set of links for screen readers.
    <nav
      aria-label="Main"
      // flex-wrap is what makes this work on a phone: when the links don't
      // fit on one line they carry on underneath, instead of pushing the page
      // wider than the screen. EVERY link stays here, because the
      // app-navigation spec says the bar links to each page (the design's
      // smaller tab set was not adopted).
      className="flex flex-wrap items-center gap-x-1 gap-y-1"
    >
      {/* The wordmark: "Collab" in the display face and an italic "z", the
          one mischievous letter (brand board). The two parts sit in ONE inner
          span: the link is a flex box, and flex would treat them as separate
          items, so a screen reader would read "Collab z" instead of
          "Collabz". */}
      <Link
        href="/"
        className={`${linkShape} mr-2 font-display text-2xl leading-none hover:bg-surface-2`}
      >
        <span>
          Collab<span className="italic text-primary-text">z</span>
        </span>
      </Link>

      {links.map((link) => {
        const isCurrent = link.href === currentHref;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isCurrent ? "page" : undefined}
            className={`${linkShape} text-sm ${isCurrent ? currentLook : otherLook}`}
          >
            {link.label}
            {link.badge}
          </Link>
        );
      })}
    </nav>
  );
}
