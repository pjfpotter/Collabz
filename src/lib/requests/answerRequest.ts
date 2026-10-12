// ANSWERING A CONNECTION REQUEST (slice 5, #12, design decision 4).
//
// answerRequest() approves or declines one request. It is the only place that
// does, and both routes (/api/requests/[id]/approve and .../decline) call it.
//
// The rules (specs: "Only the person asked can answer"):
//   - only the person the request was SENT TO can answer it,
//   - only while it is still PENDING, and only once,
//   - and not if the sender has since been suspended or either has blocked
//     the other.
// Approving also opens the conversation between the two. Declining opens
// nothing.

import { openConversation } from "@/lib/conversations";
import { prisma } from "@/lib/db";

import {
  ANSWER_REFUSAL_MESSAGES,
  REQUEST_APPROVED_MESSAGE,
  REQUEST_DECLINED_MESSAGE,
  type AnswerRefusalReason,
} from "./messages";
import { hasBlockBetween, isUserVisible } from "./pairRules";

export type RequestAnswer = "approve" | "decline";

export type AnswerRequestResult =
  | { ok: true; message: string; status: "APPROVED" | "DECLINED" }
  | { ok: false; reason: AnswerRefusalReason; message: string };

function refuse(reason: AnswerRefusalReason): AnswerRequestResult {
  return { ok: false, reason, message: ANSWER_REFUSAL_MESSAGES[reason] };
}

// Approves or declines request `requestId` on behalf of `viewerId`.
//
// Changes nothing, and says why, whenever it refuses.
export async function answerRequest(
  requestId: string,
  viewerId: string,
  answer: RequestAnswer,
): Promise<AnswerRequestResult> {
  const request = await prisma.connectionRequest.findUnique({
    where: { id: requestId },
  });

  // Not there, or not sent to this person: the same answer, so nobody can use
  // this to find out which request ids exist.
  if (!request || request.toUserId !== viewerId) {
    return refuse("not-found");
  }

  if (request.status !== "PENDING") {
    return refuse("already-answered");
  }

  // The sender may have been suspended, or someone may have blocked, since
  // the request was sent. Then it is no longer allowed (and the waiting list
  // already leaves it out, see listRequests).
  const senderStillAllowed =
    (await isUserVisible(request.fromUserId)) &&
    !(await hasBlockBetween(request.fromUserId, request.toUserId));
  if (!senderStillAllowed) {
    return refuse("unavailable");
  }

  const newStatus = answer === "approve" ? "APPROVED" : "DECLINED";

  // THE STATUS CHANGE IS "UPDATE ... ONLY IF STILL PENDING", checked by count.
  // WHY: two answers can arrive at the same moment (a double click, or both
  // routes at once). Both could pass the check above. The database lets only
  // one of the two updates match a PENDING row, so only one of them wins,
  // and only the winner goes on to open a conversation.
  const updated = await prisma.connectionRequest.updateMany({
    where: { id: requestId, status: "PENDING" },
    data: { status: newStatus },
  });
  if (updated.count === 0) {
    return refuse("already-answered");
  }

  if (answer === "approve") {
    try {
      // openConversation is safe to call twice, and the update above already
      // makes sure only one answer gets here.
      await openConversation(request.fromUserId, request.toUserId);
    } catch (error) {
      // Better a request that is still waiting than one that says
      // "connected" with no conversation behind it, which nobody would ever
      // fix. Put it back so it can be tried again, then pass the error on.
      await prisma.connectionRequest.updateMany({
        where: { id: requestId, status: "APPROVED" },
        data: { status: "PENDING" },
      });
      throw error;
    }
  }

  return {
    ok: true,
    status: newStatus,
    message: answer === "approve" ? REQUEST_APPROVED_MESSAGE : REQUEST_DECLINED_MESSAGE,
  };
}
