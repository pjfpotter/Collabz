// SENDING A MESSAGE (slice 6, #13, design decisions 2, 3 and 4).
//
// sendMessage() below is the ONE place that decides whether a message may be
// sent, and it stores the message when the answer is yes.
//
// WHY THE RULES LIVE HERE AND NOT IN THE FORM OR THE ROUTE: hiding the form
// stops nobody sending by hand, and a route is only one way in. Everything
// that sends a message goes through this function, so "only the two people,
// only while connected, never in a closed conversation" holds however it is
// called (#13 success checks 1 and 3).
//
// THE ORDER OF THE CHECKS, and why it is this order:
//
//   1. not the sender's conversation, or no such one -> "not-found"
//   2. the conversation is closed                    -> "closed"
//   3. the two aren't connected / other is suspended -> "not-connected"
//   4. nothing written                               -> "empty"
//   5. longer than the limit                         -> "too-long"
//
//   - 1 is first so a stranger learns nothing else about someone's
//     conversation, not even whether it is closed.
//   - 2 comes BEFORE 3. A block both closes the conversation and makes the
//     two "not connected". "This conversation is closed" is the clearer thing
//     to be told, and it doesn't reveal that there was a block.
//   - 4 and 5 are about the words, so they come last: they only matter once
//     the sender is allowed to say anything at all.

import { areConnected } from "@/lib/requests/areConnected";
import { prisma } from "@/lib/db";

import {
  MESSAGE_MAX_LENGTH,
  SEND_REFUSAL_MESSAGES,
  type SendRefusalReason,
} from "./messages";

// A message that was stored, or the reason it wasn't.
export type SendMessageResult =
  | { sent: true; messageId: string }
  | { sent: false; reason: SendRefusalReason; message: string };

function refuse(reason: SendRefusalReason): SendMessageResult {
  return { sent: false, reason, message: SEND_REFUSAL_MESSAGES[reason] };
}

export async function sendMessage(
  senderId: string,
  conversationId: string,
  body: string,
): Promise<SendMessageResult> {
  // Check 1. Looked up by id only, and the "is it yours" test is made on the
  // row, so a made-up id and somebody else's id take exactly the same path.
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { userAId: true, userBId: true, closedAt: true },
  });
  if (
    !conversation ||
    (conversation.userAId !== senderId && conversation.userBId !== senderId)
  ) {
    return refuse("not-found");
  }

  // Check 2.
  if (conversation.closedAt !== null) {
    return refuse("closed");
  }

  // Check 3. areConnected is slice 5's shared rule (approved request and no
  // block). Suspension isn't part of it, so the other person is looked at
  // here: a suspended person has vanished from the app, so nobody can write
  // to them either.
  const otherUserId =
    conversation.userAId === senderId ? conversation.userBId : conversation.userAId;
  const other = await prisma.user.findUnique({
    where: { id: otherUserId },
    select: { suspendedAt: true },
  });
  const connected = await areConnected(senderId, otherUserId);
  if (!connected || !other || other.suspendedAt !== null) {
    return refuse("not-connected");
  }

  // Checks 4 and 5. We trim first so "   " counts as empty, and so a stray
  // space at the end can't push a message over the limit. The trimmed text is
  // also what gets stored.
  const text = body.trim();
  if (text.length === 0) {
    return refuse("empty");
  }
  if (text.length > MESSAGE_MAX_LENGTH) {
    return refuse("too-long");
  }

  const stored = await prisma.message.create({
    data: { conversationId, senderId, body: text },
    select: { id: true },
  });
  return { sent: true, messageId: stored.id };
}
