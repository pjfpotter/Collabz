// THE WORDS FOR SENDING A CONNECTION REQUEST (slice 5, #12, task 2.2).
//
// WHY THE SENTENCES LIVE HERE AND NOT IN THE HELPER: the helper, its tests and
// the pages all need the same words. If each typed its own, a tweak to one
// would quietly break another's test. Import these and never retype them.
//
// Each sentence is something a person can read as it is. None of them says
// WHY in a way that leaks anything: see UNAVAILABLE below.

// Every way a request can be refused. A request that goes through has no
// reason.
export type RefusalReason =
  // The sender and the person asked are the same.
  | "self"
  // The person is suspended or hasn't finished their profile, or one of the
  // two has blocked the other. These are deliberately ONE reason, so the
  // answer can't be used to find out who blocked whom.
  | "unavailable"
  // A request is already waiting between the two, in either direction.
  | "already-pending"
  // The two have already agreed to connect.
  | "already-connected"
  // A request between the two was declined, in either direction. A decline is
  // final (spec: "One request per pair, and a decline is final").
  | "declined"
  // The person is not in the sender's top 5 and is not their glitch match.
  | "not-a-match";

export const REQUEST_SENT_MESSAGE = "Your connection request has been sent.";

export const REFUSAL_MESSAGES: Record<RefusalReason, string> = {
  self: "You can't send a request to yourself.",
  // WHY THIS IS VAGUE: "this person blocked you" would be a safety leak, and
  // "this person is suspended" is the admins' business. One plain sentence
  // covers both.
  unavailable: "You can't send a request to this person.",
  "already-pending":
    "A connection request is already waiting between you two. Open your Requests page to see it.",
  "already-connected": "You are already connected with this person.",
  declined: "A request between you two was declined, so a new one can't be sent.",
  // The same sentence slice 4's connect route gives for a 403, so the page
  // says one thing whichever lock catches it first.
  "not-a-match": "You can only connect with your top 5 matches and your glitch match.",
};

// ---------------------------------------------------------------------------
// Answering a request (task 4.1)
// ---------------------------------------------------------------------------

// Why an answer was refused.
export type AnswerRefusalReason =
  // No request with that id, OR it exists but was not sent to the person
  // answering. The same reason for both, so a request id can't be used to
  // find out whether someone else's request exists.
  | "not-found"
  // It was approved or declined already. The first answer stands.
  | "already-answered"
  // Pending, but the sender has since been suspended, or one of the two has
  // blocked the other.
  | "unavailable";

export const ANSWER_REFUSAL_MESSAGES: Record<AnswerRefusalReason, string> = {
  "not-found": "That request could not be found.",
  "already-answered": "That request has already been answered.",
  unavailable: "That request can no longer be answered.",
};

export const REQUEST_APPROVED_MESSAGE = "You are now connected.";
export const REQUEST_DECLINED_MESSAGE = "The request was declined.";
