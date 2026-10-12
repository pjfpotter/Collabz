// THE SHARED HALF OF THE TWO ANSWER ROUTES (slice 5, #12, design decision 4).
//
// /api/requests/[id]/approve and /api/requests/[id]/decline do the same
// things in the same order and differ only in the word they pass. So that
// order is written here once and each route file is a few lines.
//
// Answers:
//   401 - nobody is signed in
//   404 - no such request, OR it wasn't sent to this person (the same answer
//         on purpose, so ids can't be probed; a 403 would confirm they exist)
//   409 - it has already been answered, or can no longer be answered because
//         the sender was suspended or a block exists
//   200 - done: { ok: true, message }
// Every answer is JSON with a `message`, so the page's buttons can show it as
// it is (the same convention as the Connect button's route).

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/currentUser";

import { answerRequest, type RequestAnswer } from "./answerRequest";

export async function handleAnswer(
  requestId: string,
  answer: RequestAnswer,
): Promise<Response> {
  const viewer = await getCurrentUser();
  if (!viewer) {
    return NextResponse.json({ ok: false, message: "Please sign in." }, { status: 401 });
  }

  const result = await answerRequest(requestId, viewer.id, answer);

  if (result.ok) {
    return NextResponse.json({ ok: true, message: result.message });
  }

  const status = result.reason === "not-found" ? 404 : 409;
  return NextResponse.json({ ok: false, message: result.message }, { status });
}
