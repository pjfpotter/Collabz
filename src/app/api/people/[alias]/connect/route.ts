// POST /api/people/[alias]/connect - the Connect button's server side
// (slice 4, #11, design decision 10).
//
// WHY A ROUTE AND NOT CALLING THE HELPER FROM THE PAGE: the button sends
// something from the browser, and this project uses API routes for that.
//
// WHY THE SERVER CHECKS AGAIN: hiding the button on the page stops nobody from
// sending the request by hand. So this route repeats the "top 5 or glitch
// match" check. Track 5 will also enforce the rules inside its own helper,
// and two locks are fine.
//
// Answers:
//   401 - nobody is signed in
//   404 - nobody visible lives at that address (this also covers a suspended
//         person, who is not visible)
//   403 - the person is not in the viewer's top 5 or glitch match; NOTHING is
//         stored in that case
//   200 - the stand-in's answer, { sent, message }. Until slice 5 lands this
//         is always { sent: false, message: "Connection requests aren't
//         switched on yet." }

import { NextResponse } from "next/server";

import { findPersonByAddress } from "@/lib/cohort/aliasAddress";
import { getConnectPermission } from "@/lib/cohort/profile";
import { sendConnectionRequest } from "@/lib/cohort/standIns";
import { getVisiblePeople } from "@/lib/cohort/visiblePeople";
import { getCurrentUser } from "@/lib/currentUser";

// RouteContext is a helper type Next.js generates for each route. In this
// version of Next.js `params` is a Promise, so it has to be awaited.
export async function POST(
  _request: Request,
  context: RouteContext<"/api/people/[alias]/connect">,
): Promise<Response> {
  const viewer = await getCurrentUser();
  if (!viewer) {
    return NextResponse.json({ message: "Please sign in." }, { status: 401 });
  }

  const { alias } = await context.params;
  const people = await getVisiblePeople();
  const person = findPersonByAddress(people, alias);
  if (!person) {
    return NextResponse.json({ message: "Nobody lives at that address." }, { status: 404 });
  }

  const reason = await getConnectPermission(viewer.id, person.userId);
  if (reason === null) {
    return NextResponse.json(
      { message: "You can only connect with your top 5 matches and your glitch match." },
      { status: 403 },
    );
  }

  const result = await sendConnectionRequest(viewer.id, person.userId);
  return NextResponse.json(result);
}
