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

import { noticeClasses, textLinkClasses } from "@/components/formStyles";
import { SafetyActions } from "@/components/SafetyActions";
import { StateMessage } from "@/components/StateMessage";
import { SilhouetteStandIn } from "@/lib/cohort/SilhouetteStandIn";
import { requireFinishedProfile } from "@/lib/cohort/standIns";
import { getConversation } from "@/lib/messages/getConversation";
import { listConversations } from "@/lib/messages/listConversations";
import { formatMessageTime } from "@/lib/messages/formatMessageTime";

import { ConversationRow } from "../ConversationRow";
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

  // The same list as /messages, for the side column at desktop width.
  const conversations = await listConversations(viewer.id);

  return (
    // Wider from lg (1024px) so the list and the thread sit side by side
    // (Desktop layouts board). Below lg the list is hidden and the page is
    // the single column it was.
    <main className="mx-auto w-full max-w-2xl px-4 py-8 lg:max-w-5xl lg:grid lg:grid-cols-[20rem_minmax(0,1fr)] lg:gap-x-10">
      {/* `hidden lg:block` also hides it from screen readers below lg, where
          the "All conversations" link does this job. */}
      <nav
        aria-label="Your conversations"
        className="hidden lg:block lg:border-r lg:border-line lg:pr-6"
        data-testid="conversation-sidebar"
      >
        <ul className="divide-y divide-line">
          {conversations.map((summary) => (
            <li
              key={summary.conversationId}
              className={
                "py-3 " +
                (summary.conversationId === conversation.conversationId
                  ? "-mx-3 rounded-feature bg-surface-2 px-3"
                  : "")
              }
              aria-current={
                summary.conversationId === conversation.conversationId ? "page" : undefined
              }
            >
              <ConversationRow conversation={summary} />
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0">
        <p className="text-sm lg:hidden">
          <Link href="/messages" className={textLinkClasses}>
            All conversations
          </Link>
        </p>

        <div className="mt-4 flex items-center gap-3">
          <SilhouetteStandIn silhouette={conversation.silhouette} size={48} />
          <h1 className="text-3xl leading-tight [overflow-wrap:anywhere]">
            <Link href={`/people/${conversation.address}`} className="hover:underline">
              {conversation.alias}
            </Link>
          </h1>
        </div>

        {conversation.messages.length === 0 ? (
          <div className="mt-8" data-testid="no-messages">
            <StateMessage title="No messages yet. Say hello." />
          </div>
        ) : (
          <ol className="mt-8 space-y-4" data-testid="message-list">
            {conversation.messages.map((message) => (
              // Your own messages sit on the right in the brand colour and
              // theirs on the left in a quiet card, so who said what can be
              // told at a glance. The sender's name is still written above
              // each one, so it never relies on side or colour alone.
              <li
                key={message.id}
                data-testid="message"
                className={message.mine ? "flex flex-col items-end" : "flex flex-col items-start"}
              >
                <p className="text-sm text-muted">
                  <span className="font-semibold text-foreground">
                    {message.mine ? "You" : message.senderAlias}
                  </span>{" "}
                  · {formatMessageTime(message.createdAt)}
                </p>
                <p
                  className={
                    "mt-1 max-w-[85%] whitespace-pre-wrap break-words rounded-card px-4 py-2 " +
                    (message.mine
                      ? "bg-primary text-on-primary"
                      : "border border-line bg-surface text-foreground")
                  }
                >
                  {message.body}
                </p>
              </li>
            ))}
          </ol>
        )}

        <div className="mt-8">
          {conversation.closed ? (
            <p className={noticeClasses} data-testid="closed-notice">
              This conversation is closed, so no new messages can be sent in it.
            </p>
          ) : (
            <SendMessageForm conversationId={conversation.conversationId} />
          )}
        </div>

        {/* Slice 9 (#16): report or block this person. Shown on a closed
            conversation too, since that is when someone may want to. */}
        <SafetyActions address={conversation.address} alias={conversation.alias} />
      </div>
    </main>
  );
}
