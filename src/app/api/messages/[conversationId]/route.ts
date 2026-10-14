// POST /api/messages/[conversationId] - send a message in one of your
// conversations (slice 6, #13, design decision 5).
//
// All the rules are in sendMessage() (src/lib/messages/sendMessage.ts); this
// file only works out who is asking, reads the body and picks the status.
//
// Answers, all JSON with a `message` the form can show as it is:
//   401 - nobody is signed in
//   404 - no such conversation, OR it isn't yours. The same answer on purpose:
//         a 403 would confirm that somebody else's conversation id is real.
//   409 - the conversation is closed, or the two can't message each other
//   422 - the message is empty or too long
//   200 - sent: { ok: true, message }

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/currentUser";
import { sendMessage } from "@/lib/messages/sendMessage";
import type { SendRefusalReason } from "@/lib/messages/messages";

const MESSAGE_SENT = "Message sent.";

// Which status each refusal is answered with.
const STATUS_FOR_REFUSAL: Record<SendRefusalReason, number> = {
  "not-found": 404,
  closed: 409,
  "not-connected": 409,
  empty: 422,
  "too-long": 422,
};

// RouteContext is a helper type Next.js generates for each route. In this
// version of Next.js `params` is a Promise, so it has to be awaited.
export async function POST(
  request: Request,
  context: RouteContext<"/api/messages/[conversationId]">,
): Promise<Response> {
  const viewer = await getCurrentUser();
  if (!viewer) {
    return NextResponse.json({ ok: false, message: "Please sign in." }, { status: 401 });
  }

  const { conversationId } = await context.params;

  // Read the body as JSON: { "body": "the text" }. Anything else (not JSON,
  // or no text) is treated as an empty message. sendMessage still checks
  // "is this your conversation" first, so a stranger gets 404, not a hint.
  let body = "";
  try {
    const parsed: unknown = await request.json();
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "body" in parsed &&
      typeof parsed.body === "string"
    ) {
      body = parsed.body;
    }
  } catch {
    // Not valid JSON: leave `body` empty.
  }

  const result = await sendMessage(viewer.id, conversationId, body);

  if (result.sent) {
    return NextResponse.json({ ok: true, message: MESSAGE_SENT });
  }
  return NextResponse.json(
    { ok: false, message: result.message },
    { status: STATUS_FOR_REFUSAL[result.reason] },
  );
}
