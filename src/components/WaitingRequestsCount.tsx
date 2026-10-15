// The number of connection requests waiting for you, shown beside the
// "Requests" link in the nav bar (slice 5, #12, design decision 7).
//
// A Server Component, so it can ask who is signed in and read the database.
// It draws NOTHING when nobody is signed in or when no request is waiting, so
// the link looks exactly as it did before for most people most of the time.
//
// The number is the same one the /requests page lists (see
// countWaitingRequests), so it can't promise something the page can't show.

import { getCurrentUser } from "@/lib/currentUser";
import { countWaitingRequests } from "@/lib/requests/listRequests";

// Works out the number, or 0 when there is nothing to show.
//
// WHY A try/catch, AND WHY IT IS IN THIS SEPARATE FUNCTION: this sits in the
// nav bar, which is on EVERY page. A failed count (say the database blinked)
// must not take down the whole site, so it quietly counts as 0 instead. The
// drawing is kept out of the try/catch below because React's linter rule says
// a try/catch can't catch errors from drawing a component.
export async function findWaitingCount(): Promise<number> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return 0;
    }
    return await countWaitingRequests(user.id);
  } catch {
    return 0;
  }
}

export async function WaitingRequestsCount() {
  const count = await findWaitingCount();
  if (count === 0) {
    return null;
  }

  return (
    // A small pill with the number, in the primary colour. data-testid
    // stays so the tests can find it.
    <span
      className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-on-primary"
      data-testid="waiting-count"
    >
      {count}
      {/* Only for screen readers: "3" alone doesn't say what it is. */}
      <span className="sr-only"> waiting</span>
    </span>
  );
}
