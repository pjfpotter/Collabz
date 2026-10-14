// /messages - your conversations (slice 6, #13, design decision 5).
//
// A Server Component. It loads the list with listConversations() and draws one
// row per conversation, each linking to /messages/[conversationId].
//
// Only public things are shown: alias, silhouette, the start of the latest
// message and its time. Never an email and never a user id.

import Link from "next/link";

import { textLinkClasses } from "@/components/formStyles";
import { PersonRow } from "@/components/PersonRow";
import { StateMessage } from "@/components/StateMessage";
import { StatusPill } from "@/components/StatusPill";
import { requireFinishedProfile } from "@/lib/cohort/standIns";
import { formatMessageTime } from "@/lib/messages/formatMessageTime";
import {
  listConversations,
  type ConversationSummary,
} from "@/lib/messages/listConversations";

// Sets the browser tab title for this page.
export const metadata = {
  title: "Messages · Collabz",
};

export default async function MessagesPage() {
  // Not signed in -> /signin. No finished profile -> /onboarding.
  const viewer = await requireFinishedProfile();

  const conversations = await listConversations(viewer.id);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="text-4xl">Messages</h1>
      <p className="mt-2 text-muted">
        Private conversations with the people you have connected with.
      </p>

      {conversations.length === 0 ? (
        <div className="mt-8" data-testid="no-conversations">
          <StateMessage title="You have no conversations yet.">
            Find someone on the{" "}
            <Link href="/graph" className={textLinkClasses}>
              graph
            </Link>{" "}
            and ask to connect, or check your{" "}
            <Link href="/requests" className={textLinkClasses}>
              requests
            </Link>
            .
          </StateMessage>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-line" data-testid="conversation-list">
          {conversations.map((conversation) => (
            <li key={conversation.conversationId} className="py-4">
              <ConversationRow conversation={conversation} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

// One conversation in the list.
function ConversationRow({ conversation }: { conversation: ConversationSummary }) {
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
