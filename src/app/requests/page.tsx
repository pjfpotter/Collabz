// /requests - connection requests waiting for you, and the ones you sent
// (slice 5, #12, design decision 9).
//
// A Server Component. It loads both lists, and the Approve and Decline buttons
// are a small Client Component (RequestActions.tsx).
//
// Only public things are shown: alias, silhouette and a link to the profile.
// Never an email and never a photo: slice 7 owns photos, and an email is
// never shown to another user (rule B1).

import Link from "next/link";

import { SilhouetteStandIn, requireFinishedProfile } from "@/lib/cohort/standIns";
import {
  getRequestsPage,
  type SentRequest,
  type SentRequestStatus,
  type WaitingRequest,
} from "@/lib/requests/listRequests";

import { RequestActions } from "./RequestActions";

// Sets the browser tab title for this page.
export const metadata = {
  title: "Requests · Collabz",
};

export default async function RequestsPage() {
  // Not signed in -> /signin. No finished profile -> /onboarding.
  const viewer = await requireFinishedProfile();

  const { waiting, sent } = await getRequestsPage(viewer.id);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="text-3xl font-semibold">Requests</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Nothing private opens until you both agree to connect.
      </p>

      <section className="mt-8" aria-labelledby="waiting-heading">
        <h2 id="waiting-heading" className="text-xl font-semibold">
          Waiting for your answer
        </h2>

        {waiting.length === 0 ? (
          <p className="mt-3" data-testid="no-waiting">
            Nobody is waiting for an answer.
          </p>
        ) : (
          <>
            {/* Said before the buttons, not after, so nobody finds out by
                pressing one. */}
            <p className="mt-2 text-sm">
              Declining is final: neither of you can send the other another request.
            </p>
            <ul className="mt-2 divide-y divide-current/20" data-testid="waiting-list">
              {waiting.map((request) => (
                <li key={request.requestId} className="py-4">
                  <WaitingRow request={request} />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="mt-10" aria-labelledby="sent-heading">
        <h2 id="sent-heading" className="text-xl font-semibold">
          Sent by you
        </h2>

        {sent.length === 0 ? (
          <p className="mt-3" data-testid="no-sent">
            You haven&apos;t asked anyone to connect yet. Find someone on the{" "}
            <Link href="/graph" className="underline underline-offset-4">
              graph
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-current/20" data-testid="sent-list">
            {sent.map((request) => (
              <li key={request.requestId} className="py-4">
                <SentRow request={request} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

// One request waiting for the viewer's answer.
function WaitingRow({ request }: { request: WaitingRequest }) {
  return (
    <div className="flex items-start gap-3">
      <SilhouetteStandIn silhouette={request.silhouette} size={48} />

      <div className="min-w-0 flex-1">
        <p>
          <span className="font-semibold">{request.alias}</span> would like to connect.
        </p>
        <p className="text-sm">
          <Link
            href={`/people/${request.address}`}
            className="underline underline-offset-4"
          >
            View profile
          </Link>
        </p>

        <RequestActions requestId={request.requestId} alias={request.alias} />
      </div>
    </div>
  );
}

// One request the viewer sent, with where it stands.
function SentRow({ request }: { request: SentRequest }) {
  return (
    <div className="flex items-start gap-3">
      <SilhouetteStandIn silhouette={request.silhouette} size={48} />

      <div className="min-w-0 flex-1">
        <p>
          <Link
            href={`/people/${request.address}`}
            className="font-semibold underline underline-offset-4"
          >
            {request.alias}
          </Link>
        </p>
        <p className="text-sm" data-testid="sent-status">
          {statusSentence(request.status)}
        </p>
        {/* A connection is where messaging starts (slice 6). The page behind
            this link is a placeholder until that slice lands. */}
        {request.status === "connected" && (
          <p className="text-sm">
            <Link href="/messages" className="underline underline-offset-4">
              Go to messages
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

// The status in words. "Declined" is plain: the spec says the sender sees it.
function statusSentence(status: SentRequestStatus): string {
  switch (status) {
    case "waiting":
      return "Waiting";
    case "connected":
      return "Connected";
    case "declined":
      return "Declined";
  }
}
