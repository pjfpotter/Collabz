// POST /api/requests/[id]/decline - decline a connection request sent to you
// (slice 5, #12, design decision 4).
//
// A decline is final for the pair: neither person can send the other a new
// request afterwards (spec: "One request per pair, and a decline is final").
// All the rules are in answerRequest(); the answers are in answerHandler.ts.

import { handleAnswer } from "@/lib/requests/answerHandler";

export async function POST(
  _request: Request,
  context: RouteContext<"/api/requests/[id]/decline">,
): Promise<Response> {
  const { id } = await context.params;
  return handleAnswer(id, "decline");
}
