// THE PROFILE PAGE'S AND THE CONNECT ROUTE'S SHARED LOGIC (slice 4, #11,
// design decision 10).
//
// WHY THIS IS NOT INSIDE THE PAGE FILE: two places need the same answers.
//
//   - the profile page asks "should I show a Connect button?"
//   - the Connect route asks "may this request go through?"
//
// If each worked it out separately, a mistake in one would let a request
// through that the other would have hidden. So both call
// getConnectPermission() below, and the rule is written once.

import { prisma } from "@/lib/db";

import { aliasToAddress, findPersonByAddress } from "./aliasAddress";
import { getTopFive, explainMatch, profileBio, type MatchExplanation } from "./standIns";
import { getVisiblePeople, type VisiblePerson } from "./visiblePeople";

// ---------------------------------------------------------------------------
// 1. May the viewer connect with this person?
// ---------------------------------------------------------------------------

// Why a viewer may connect with someone:
//   "top-five" - they are in the viewer's top 5 matches
//   "glitch"   - they are the viewer's glitch match (the one surprise match)
//   null       - neither, so there is no Connect action and the server
//                refuses a request sent by hand (search must not widen who
//                can be contacted, people-search spec)
export type ConnectReason = "top-five" | "glitch" | null;

// Works out whether `viewerId` may send a connection request to
// `otherUserId`. A glitch match is checked first, so someone who is both is
// described as the glitch match: that is the more surprising thing to say.
export async function getConnectPermission(
  viewerId: string,
  otherUserId: string,
): Promise<ConnectReason> {
  if (viewerId === otherUserId) {
    // Nobody connects with themselves.
    return null;
  }

  const glitch = await prisma.glitchMatch.findUnique({
    where: { userId: viewerId },
    select: { matchedUserId: true },
  });
  if (glitch?.matchedUserId === otherUserId) {
    // A glitch match is only usable while the person is still visible.
    // getTopFive leaves suspended people out the same way.
    const stillVisible = (await getVisiblePeople()).some(
      (person) => person.userId === otherUserId,
    );
    return stillVisible ? "glitch" : null;
  }

  // getTopFive already leaves out suspended and unfinished people.
  const topFive = await getTopFive(viewerId);
  const isInTopFive = topFive.some((match) => match.userId === otherUserId);
  return isInTopFive ? "top-five" : null;
}

// ---------------------------------------------------------------------------
// 2. Is there already a request between the two?
// ---------------------------------------------------------------------------

// What the profile page can say about an existing request. Declined requests
// are not shown: the people-search spec only asks for "pending or approved".
export type RequestStatus = "PENDING" | "APPROVED";

// Looks for the NEWEST pending or approved request between the two people, in
// either direction, and returns its status (or null if there is none).
//
// WHY "NEWEST": the table allows more than one request per pair (a declined
// one, then a new one later), so there can be several rows. The latest
// living one is the one that matters.
export async function findRequestStatus(
  viewerId: string,
  otherUserId: string,
): Promise<RequestStatus | null> {
  const newest = await prisma.connectionRequest.findFirst({
    where: {
      status: { in: ["PENDING", "APPROVED"] },
      // Either person could have asked: viewer -> other, or other -> viewer.
      OR: [
        { fromUserId: viewerId, toUserId: otherUserId },
        { fromUserId: otherUserId, toUserId: viewerId },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: { status: true },
  });

  if (!newest) {
    return null;
  }
  // Prisma's type also includes DECLINED, but the query above excluded it.
  // This check tells TypeScript that, instead of using a cast.
  return newest.status === "PENDING" || newest.status === "APPROVED" ? newest.status : null;
}

// ---------------------------------------------------------------------------
// 3. Tags grouped by category
// ---------------------------------------------------------------------------

export type TagGroup = {
  categoryId: string;
  categoryName: string;
  tagNames: string[];
};

// Groups a person's tags under their category, in catalogue order.
//
// `visiblePeople` already returns the tags sorted by category and then by
// position, so the groups come out in the right order if we simply walk the
// list and start a new group whenever the category changes.
//
// Retired tags are kept: a retired tag stays on the profiles that already
// use it (admin spec). Retired CATEGORIES are kept for the same reason, which
// is why the names come from a query that does not filter them out.
function groupTags(
  tags: VisiblePerson["tags"],
  categoryNames: Map<string, string>,
): TagGroup[] {
  const groups: TagGroup[] = [];
  for (const tag of tags) {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.categoryId === tag.categoryId) {
      lastGroup.tagNames.push(tag.name);
    } else {
      groups.push({
        categoryId: tag.categoryId,
        // Falls back to the id if a category is somehow missing, so the page
        // never shows "undefined".
        categoryName: categoryNames.get(tag.categoryId) ?? tag.categoryId,
        tagNames: [tag.name],
      });
    }
  }
  return groups;
}

// ---------------------------------------------------------------------------
// 4. Everything the profile page needs, in one call
// ---------------------------------------------------------------------------

// What the page is allowed to show about the person. No email, no database
// id: the page is rendered for other people (rule B1).
export type ProfileView = {
  alias: string;
  address: string;
  silhouette: string;
  courseName: string | null;
  bio: string;
  tagGroups: TagGroup[];
};

// The "match" half of the page. It only exists for someone else's profile.
export type MatchView = {
  // null when no score is stored for the pair (shouldn't happen once slice 3
  // exists, but a page must cope).
  explanation: MatchExplanation | null;
  connectReason: ConnectReason;
  requestStatus: RequestStatus | null;
};

export type ProfileLookup =
  // Nobody visible lives at this address: the page shows "page not found".
  | { kind: "not-found" }
  // The viewer's own profile: no breakdown and no Connect.
  | { kind: "own"; profile: ProfileView }
  | { kind: "other"; profile: ProfileView; match: MatchView };

// Finds the person at `address` and gathers everything the page shows.
//
// Only VISIBLE people are searched (getVisiblePeople), so a suspended person
// or an unfinished profile comes back as "not-found" with no extra code.
export async function getProfileLookup(
  viewerId: string,
  address: string,
): Promise<ProfileLookup> {
  const people = await getVisiblePeople();
  const person = findPersonByAddress(people, address);
  if (!person) {
    return { kind: "not-found" };
  }

  const categories = await prisma.category.findMany({
    select: { id: true, name: true },
  });
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));

  const tagGroups = groupTags(person.tags, categoryNames);

  // profileBio wants { categoryId: [tag names] }. Built from the same groups.
  const tagNamesByCategory: Record<string, string[]> = {};
  for (const group of tagGroups) {
    tagNamesByCategory[group.categoryId] = group.tagNames;
  }

  const profile: ProfileView = {
    alias: person.alias,
    address: aliasToAddress(person.alias),
    silhouette: person.silhouette,
    courseName: person.courseName,
    bio: profileBio(tagNamesByCategory),
    tagGroups,
  };

  if (person.userId === viewerId) {
    return { kind: "own", profile };
  }

  return {
    kind: "other",
    profile,
    match: {
      explanation: await explainMatch(viewerId, person.userId),
      connectReason: await getConnectPermission(viewerId, person.userId),
      requestStatus: await findRequestStatus(viewerId, person.userId),
    },
  };
}
