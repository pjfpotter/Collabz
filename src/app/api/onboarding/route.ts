// POST /api/onboarding - saves a finished onboarding (slice 2, #9, design
// decision 3).
//
// The wizard on /onboarding sends everything once, at the end:
//   { "picks": { "<category id>": ["<tag id>", ...], ... },
//     "silhouetteId": "silhouette-03" }
//
// WHY AN API ROUTE AND NOT A SERVER ACTION: the project uses API routes for
// what the browser sends, and a plain route can be tested with an ordinary
// request.
//
// Answers:
//   401 - nobody is signed in
//   409 - their profile is already finished (editing is /account, slice 7)
//   400 - the answers break a rule; `problems` says which step to fix.
//         Nothing is saved.
//   200 - saved; `alias` is the name they were given.

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/currentUser";
import { saveOnboarding } from "@/lib/profile/saveOnboarding";
import type { OnboardingAnswers } from "@/lib/profile/validateAnswers";

export async function POST(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "Please sign in." }, { status: 401 });
  }

  const answers = await readAnswers(request);
  if (!answers) {
    return NextResponse.json(
      { message: "Those answers couldn't be read.", problems: [] },
      { status: 400 },
    );
  }

  const result = await saveOnboarding(user.id, answers);

  if (result.outcome === "already-complete") {
    return NextResponse.json(
      { message: "Your profile is already finished. You can change it from your account." },
      { status: 409 },
    );
  }
  if (result.outcome === "invalid") {
    return NextResponse.json(
      { message: "Some answers need fixing.", problems: result.problems },
      { status: 400 },
    );
  }
  return NextResponse.json({ alias: result.alias });
}

// Reads the request body into the shape saveOnboarding expects, or returns
// null if it isn't that shape.
//
// WHY SO CAREFUL: the body comes from outside and could be anything (not
// JSON, a number where a list should be...). Checking the SHAPE here means
// the rules in validateOnboardingAnswers only ever deal with well-formed
// answers, and a bad request gets a 400 rather than crashing the server.
async function readAnswers(request: Request): Promise<OnboardingAnswers | null> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return null; // not JSON at all
  }

  if (typeof body !== "object" || body === null) {
    return null;
  }
  const { picks, silhouetteId } = body as { picks?: unknown; silhouetteId?: unknown };

  if (typeof silhouetteId !== "string") {
    return null;
  }
  if (typeof picks !== "object" || picks === null || Array.isArray(picks)) {
    return null;
  }

  // Every value in `picks` must be a list of strings.
  const cleanPicks: Record<string, string[]> = {};
  for (const [categoryId, tagIds] of Object.entries(picks)) {
    if (!Array.isArray(tagIds) || !tagIds.every((tagId) => typeof tagId === "string")) {
      return null;
    }
    cleanPicks[categoryId] = tagIds;
  }

  return { picks: cleanPicks, silhouetteId };
}
