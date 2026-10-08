// POST /api/dev/sign-in-as - the server side of the dev "sign in as…"
// switcher (foundation #7, design decision 7).
//
// The switcher in the nav bar is a plain HTML form. When you pick a pretend
// user and press "Switch", the browser posts the form here. This route
// remembers your choice in a cookie and sends you back to the page you were
// on. From then on getCurrentUser() (src/lib/currentUser.ts) reads that
// cookie and treats you as that user.
//
// DEV ONLY. Where the pretend cohort is switched off, and always on the live
// site, this answers "404 Not Found", exactly as if the route didn't exist.
//
// Why an API route (a "Route Handler") at all: in this version of Next.js a
// cookie can only be SET from a Route Handler or a Server Function, never
// while a page is being drawn. And a plain form posting to a route works
// without any JavaScript in the browser.
//
// Join-up (#17) deletes this file when real sign-in replaces the switcher.

import { NextResponse } from "next/server";

import { findPretendUser } from "@/lib/currentUser";
import { DEV_USER_COOKIE, isPretendCohortEnabled } from "@/lib/pretendCohort";

export async function POST(request: Request): Promise<Response> {
  // The safety check comes before anything else is read.
  if (!isPretendCohortEnabled()) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // The form has one field: `userId`. It is the chosen pretend user's id, or
  // empty when "Signed out" was picked.
  const formData = await request.formData();
  const chosenUserId = String(formData.get("userId") ?? "");

  // Send the browser back to where it came from.
  // 303 ("See Other") tells the browser to fetch that page with an ordinary
  // GET. The usual redirect code in Next.js (307) would make the browser
  // POST the form again to the page, which isn't what we want.
  const response = NextResponse.redirect(pageToReturnTo(request), 303);

  // Only remember the choice if it is a pretend user who really exists.
  // findPretendUser() refuses anything else (a made-up id, or a real
  // student's id), and then we sign the visitor OUT rather than leaving
  // whoever they were before: a wrong choice should never look like it worked.
  const chosenUser = chosenUserId ? await findPretendUser(chosenUserId) : null;

  if (chosenUser) {
    response.cookies.set(DEV_USER_COOKIE, chosenUser.id, {
      // httpOnly: scripts running in the page can't read the cookie.
      httpOnly: true,
      // lax: the cookie is sent when you follow a link to the site, but not
      // on requests another website makes behind your back.
      sameSite: "lax",
      // Send it with every page of the site, not just /api/dev/...
      path: "/",
      // No expiry date is given, which makes it a "session cookie": the
      // browser forgets it when it is closed.
    });
  } else {
    response.cookies.delete(DEV_USER_COOKIE);
  }

  return response;
}

// Works out which page the form was sent from, so we can go back to it.
//
// Browsers say where a request came from in the "Referer" header. We do NOT
// simply redirect to whatever that header says: we take only the path and
// the query from it ("/people?course=software") and attach them to OUR OWN
// site's address. So even if the header were faked to point at another
// website, the visitor can only ever land on a page of this site.
//
// If there is no usable header, we go to the home page.
function pageToReturnTo(request: Request): URL {
  const homePage = new URL("/", request.url);

  const cameFrom = request.headers.get("referer");
  if (!cameFrom) {
    return homePage;
  }

  try {
    const previousPage = new URL(cameFrom);
    return new URL(previousPage.pathname + previousPage.search, request.url);
  } catch {
    // The header wasn't a valid address at all.
    return homePage;
  }
}
