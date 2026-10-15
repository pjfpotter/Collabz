// One conversation in a list of conversations (slice 6, #13; moved here in
// slice 10, #45, task 10.1).
//
// WHY ITS OWN FILE: /messages draws a list of these, and from the lg
// breakpoint (1024px) the conversation page draws the same list beside the
// thread. One component means the two lists can't drift apart.

import { PersonRow } from "@/components/PersonRow";
import { StatusPill } from "@/components/StatusPill";
import { formatMessageTime } from "@/lib/messages/formatMessageTime";
import type { ConversationSummary } from "@/lib/messages/listConversations";

// One conversation in the list.
export function ConversationRow({ conversation }: { conversation: ConversationSummary }) {
  return (
    <PersonRow
      alias={conversation.alias}
      silhouette={conversation.silhouette}
      courseId={null}
      courseName={null}
      href={`/messages/${conversation.conversationId}`}
    >
      {conversation.closed && (
        <p className="mt-1">
          <StatusPill status="declined">
            <span data-testid="closed-marker">(closed)</span>
          </StatusPill>
        </p>
      )}

      {conversation.latestPreview !== null && conversation.latestAt !== null ? (
        <>
          {/* truncate keeps a long preview on one line on a phone. */}
          <p className="mt-1 truncate text-sm">{conversation.latestPreview}</p>
          <p className="text-sm text-muted">{formatMessageTime(conversation.latestAt)}</p>
        </>
      ) : (
        <p className="mt-1 text-sm text-muted">No messages yet.</p>
      )}
    </PersonRow>
  );
}
