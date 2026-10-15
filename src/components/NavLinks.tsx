"use client";

// The same routes stay available everywhere. On phones they live in a
// dropdown so navigation does not push the actual page below the fold.
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export type NavLinkItem = { href: string; label: string };

const linkShape =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-control px-3 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-text";
const currentLook = "bg-surface-2 font-semibold text-primary-text";
const otherLook = "font-medium hover:bg-surface-2";

function findCurrentHref(pathname: string, links: NavLinkItem[]): string | null {
  let best: string | null = null;
  for (const link of links) {
    const matches = pathname === link.href || pathname.startsWith(link.href + "/");
    if (matches && (best === null || link.href.length > best.length)) best = link.href;
  }
  return best;
}

function WaitingBadge({ count, shortcut = false }: { count: number; shortcut?: boolean }) {
  if (count <= 0) return null;
  return (
    <span
      className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-on-primary"
      data-testid={shortcut ? "mobile-waiting-count" : "waiting-count"}
    >
      {count}<span className="sr-only"> waiting</span>
    </span>
  );
}

export function NavLinks({ links, waitingCount = 0, accountStatus }: {
  links: NavLinkItem[];
  waitingCount?: number;
  accountStatus?: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const currentHref = findCurrentHref(pathname, links);
  const [openPath, setOpenPath] = useState<string | null>(null);
  const isOpen = openPath === pathname;
  const panelId = useId();
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Layouts survive navigation, so server-rendered counts otherwise stay
    // stale when another person sends a request. Refresh visible pages only.
    const refreshVisiblePage = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = window.setInterval(refreshVisiblePage, 30_000);
    window.addEventListener("focus", refreshVisiblePage);
    document.addEventListener("visibilitychange", refreshVisiblePage);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshVisiblePage);
      document.removeEventListener("visibilitychange", refreshVisiblePage);
    };
  }, [router]);

  function closeMenu() { setOpenPath(null); }

  return (
    <nav aria-label="Main" className="flex w-full flex-wrap items-center gap-x-1 gap-y-1"
      onKeyDown={(event) => {
        if (event.key === "Escape" && isOpen) {
          closeMenu();
          menuButton.current?.focus();
        }
      }}
    >
      <Link href="/" onClick={closeMenu}
        className={`${linkShape} mr-auto font-display text-2xl leading-none hover:bg-surface-2 lg:mr-2 lg:self-start`}>
        <span>Collab<span className="italic text-primary-text">z</span></span>
      </Link>

      {/* Requests remain noticeable while the mobile dropdown is closed. */}
      {waitingCount > 0 && (
        <Link href="/requests" prefetch={false} onClick={closeMenu}
          className={`${linkShape} text-sm lg:hidden`} aria-label={`${waitingCount} requests waiting`}>
          Requests<WaitingBadge count={waitingCount} shortcut />
        </Link>
      )}
      <button type="button" ref={menuButton} aria-expanded={isOpen} aria-controls={panelId}
        onClick={() => setOpenPath(isOpen ? null : pathname)}
        className={`${linkShape} border border-line-strong text-sm font-medium lg:hidden`}>
        Menu <span aria-hidden="true" className="ml-2">{isOpen ? "â–´" : "â–¾"}</span>
      </button>

      {/* One route list serves both layouts; ordinary links retain native
          keyboard behaviour rather than pretending to be an ARIA menu. */}
      <div id={panelId} className={`${isOpen ? "flex" : "hidden"} w-full flex-col gap-2 border-t border-line pt-2 lg:flex lg:w-auto lg:flex-1 lg:flex-row lg:flex-wrap lg:items-center lg:border-0 lg:pt-0`}>
        <div className="grid grid-cols-2 gap-1 lg:flex lg:flex-wrap lg:items-center">
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={closeMenu}
              prefetch={link.href === "/requests" ? false : undefined}
              aria-current={link.href === currentHref ? "page" : undefined}
              className={`${linkShape} text-sm ${link.href === currentHref ? currentLook : otherLook}`}>
              {link.label}{link.href === "/requests" && <WaitingBadge count={waitingCount} />}
            </Link>
          ))}
        </div>
        <div className="min-w-0 border-t border-line py-2 [overflow-wrap:anywhere] lg:ml-auto lg:border-0 lg:py-0">
          {accountStatus}
        </div>
      </div>
    </nav>
  );
}
