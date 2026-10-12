// POST /api/requests/[id]/approve - approve a connection request sent to you
// (slice 5, #12, design decision 4).
//
// All the rules (who may answer, only once, opening the conversation) are in
// answerRequest(); the answers are listed in answerHandler.ts. Approving opens
// a conversation between the two and nothing else: no email is ever revealed.
//
// WHY TWO ROUTES AND NOT ONE WITH A BODY: the address says what happens, and
// there is nothing to parse, so each is a few lines a beginner can read.

import { handleAnswer } from "@/lib/requests/answerHandler";

// RouteContext is a helper type Next.js generates for each route. In this
// version of Next.js `params` is a Promise, so it has to be awaited.
export async function POST(
  _request: Request,
  context: RouteContext<"/api/requests/[id]/approve">,
): Promise<Response> {
  const { id } = await context.params;
  return handleAnswer(id, "approve");
}
