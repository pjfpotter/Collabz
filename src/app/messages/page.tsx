// /messages - your conversations (slice 6, #13, design decision 5).
//
// A Server Component. It loads the list with listConversations() and draws one
// row per conversation, each linking to /messages/[conversationId].
//
// Only public things are shown: alias, silhouette, the start of the latest
// message and its time. Never an email and never a user id.

import Link from "next/link";

import { SilhouetteStandIn, requireFinishedProfile } from "@/lib/cohort/standIns";
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
      <h1 className="text-3xl font-semibold">Messages</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Private conversations with the people you have connected with.
      </p>

      {conversations.length === 0 ? (
        <p className="mt-8" data-testid="no-conversations">
          You have no conversations yet. Find someone on the{" "}
          <Link href="/graph" className="underline underline-offset-4">
            graph
          </Link>{" "}
          and ask to connect, or check your{" "}
          <Link href="/requests" className="underline underline-offset-4">
            requests
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-current/20" data-testid="conversation-list">
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
    <div className="flex items-start gap-3">
      <SilhouetteStandIn silhouette={conversation.silhouette} size={48} />

      <div className="min-w-0 flex-1">
        <p>
          <Link
            href={`/messages/${conversation.conversationId}`}
            className="font-semibold underline underline-offset-4"
          >
            {conversation.alias}
          </Link>
          {conversation.closed && (
            <span className="ml-2 text-sm" data-testid="closed-marker">
              (closed)
            </span>
          )}
        </p>

        {conversation.latestPreview !== null && conversation.latestAt !== null ? (
          <>
            {/* truncate keeps a long preview on one line on a phone. */}
            <p className="truncate text-sm">{conversation.latestPreview}</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {formatMessageTime(conversation.latestAt)}
            </p>
          </>
        ) : (
          <p className="text-sm">No messages yet.</p>
        )}
      </div>
    </div>
  );
}
