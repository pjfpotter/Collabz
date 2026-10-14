// /messages/[conversationId] - one conversation (slice 6, #13, design
// decisions 5 to 7).
//
// A Server Component. getConversation() decides whether this conversation is
// the viewer's; when it isn't (or doesn't exist) the page is the standard
// "page not found", the same for both so an id can't be probed.
//
// Messages are drawn as plain text: React escapes them, so a message can
// never inject markup, and `whitespace-pre-wrap` keeps the sender's line
// breaks. A closed conversation shows what was said and no form.

import Link from "next/link";
import { notFound } from "next/navigation";

import { SilhouetteStandIn, requireFinishedProfile } from "@/lib/cohort/standIns";
import { getConversation } from "@/lib/messages/getConversation";
import { formatMessageTime } from "@/lib/messages/formatMessageTime";

import { SendMessageForm } from "./SendMessageForm";

// Sets the browser tab title for this page.
export const metadata = {
  title: "Conversation · Collabz",
};

export default async function ConversationPage({
  params,
}: {
  // In this version of Next.js `params` is a Promise, so it is awaited.
  params: Promise<{ conversationId: string }>;
}) {
  const viewer = await requireFinishedProfile();
  const { conversationId } = await params;

  const conversation = await getConversation(viewer.id, conversationId);
  if (!conversation) {
    // Not yours, or no such conversation. notFound() throws, so nothing
    // below runs.
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <p className="text-sm">
        <Link href="/messages" className="underline underline-offset-4">
          All conversations
        </Link>
      </p>

      <div className="mt-4 flex items-center gap-3">
        <SilhouetteStandIn silhouette={conversation.silhouette} size={48} />
        <h1 className="text-2xl font-semibold">
          <Link
            href={`/people/${conversation.address}`}
            className="underline underline-offset-4"
          >
            {conversation.alias}
          </Link>
        </h1>
      </div>

      {conversation.messages.length === 0 ? (
        <p className="mt-8" data-testid="no-messages">
          No messages yet. Say hello.
        </p>
      ) : (
        <ol className="mt-8 space-y-4" data-testid="message-list">
          {conversation.messages.map((message) => (
            <li key={message.id} data-testid="message">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                <span className="font-semibold">
                  {message.mine ? "You" : message.senderAlias}
                </span>{" "}
                · {formatMessageTime(message.createdAt)}
              </p>
              <p className="whitespace-pre-wrap break-words">{message.body}</p>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-8">
        {conversation.closed ? (
          <p data-testid="closed-notice">
            This conversation is closed, so no new messages can be sent in it.
          </p>
        ) : (
          <SendMessageForm conversationId={conversation.conversationId} />
        )}
      </div>
    </main>
  );
}
