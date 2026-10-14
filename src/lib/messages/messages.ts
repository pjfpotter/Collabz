// THE WORDS AND THE LIMIT FOR SENDING A MESSAGE (slice 6, #13, task 3.1).
//
// WHY THESE LIVE HERE AND NOT IN THE HELPER: the helper, the route, the form
// and the tests all need the same sentences and the same number. If each typed
// its own, changing one would quietly break another. Import these and never
// retype them. (The same idea as slice 5's src/lib/requests/messages.ts.)

// The longest message allowed, in characters.
//
// WHY 1000: long enough for a proper "here's what I'm thinking" paragraph or
// two, short enough that a conversation stays easy to read on a phone.
// The server checks it every time; the form's maxLength is only a courtesy.
export const MESSAGE_MAX_LENGTH = 1000;

// Every way a message can be refused. A message that goes through has no
// reason.
export type SendRefusalReason =
  // No such conversation, OR it exists but the sender isn't one of its two
  // people. Deliberately ONE reason, so an id can't be probed to find out
  // whether somebody else's conversation exists.
  | "not-found"
  // The conversation has been closed (for example by a block). Final.
  | "closed"
  // The two are no longer connected, or the other person is suspended. One
  // reason for all of these, so it can't be used to find out who blocked whom.
  | "not-connected"
  // Nothing was written, or only spaces.
  | "empty"
  // More than MESSAGE_MAX_LENGTH characters.
  | "too-long";

export const SEND_REFUSAL_MESSAGES: Record<SendRefusalReason, string> = {
  "not-found": "We couldn't find that conversation.",
  closed: "This conversation is closed, so no new messages can be sent in it.",
  // WHY THIS IS VAGUE: "they blocked you" would be a safety leak, and
  // "they are suspended" is the admins' business.
  "not-connected": "You can't send messages to this person.",
  empty: "Write something first, then send it.",
  "too-long": `That message is too long. Please keep it to ${MESSAGE_MAX_LENGTH} characters or fewer.`,
};
