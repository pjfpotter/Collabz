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

import { requireFinishedProfile } from "@/lib/cohort/standIns";
import {
  getRequestsPage,
  type SentRequest,
  type SentRequestStatus,
  type WaitingRequest,
} from "@/lib/requests/listRequests";

import { textLinkClasses } from "@/components/formStyles";
import { PersonRow } from "@/components/PersonRow";
import { StateMessage } from "@/components/StateMessage";
import { StatusPill } from "@/components/StatusPill";

import { RequestActions } from "./RequestActions";

// Sets the browser tab title for this page.
export const metadata = {
  title: "Requests Â· Collabz",
};

export default async function RequestsPage() {
  // Not signed in -> /signin. No finished profile -> /onboarding.
  const viewer = await requireFinishedProfile();

  const { waiting, sent, connected } = await getRequestsPage(viewer.id);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="text-4xl">Requests</h1>
      <p className="mt-2 text-muted">
        Nothing private opens until you both agree to connect.
      </p>

      <section className="mt-8" aria-labelledby="waiting-heading">
        <h2 id="waiting-heading" className="text-3xl">
          Waiting for your answer
        </h2>

        {waiting.length === 0 ? (
          <div className="mt-3" data-testid="no-waiting">
            <StateMessage title="Nobody is waiting for an answer." />
          </div>
        ) : (
          <>
            {/* Said before the buttons, not after, so nobody finds out by
                pressing one. */}
            <p className="mt-2 text-sm text-muted">
              Declining is final: neither of you can send the other another request.
            </p>
            <ul className="mt-2 divide-y divide-line" data-testid="waiting-list">
              {waiting.map((request) => (
                <li key={request.requestId} className="py-4">
                  <WaitingRow request={request} />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="mt-10" aria-labelledby="connected-heading">
        <h2 id="connected-heading" className="text-3xl">Connected</h2>
        {connected.length === 0 ? (
          <div className="mt-3" data-testid="no-connections">
            <StateMessage title="No accepted connections yet." />
          </div>
        ) : (
          <ul className="mt-2 divide-y divide-line" data-testid="connected-list">
            {connected.map((person) => (
              <li key={person.requestId} className="py-4">
                <PersonRow alias={person.alias} silhouette={person.silhouette}
                  courseId={null} courseName={null} href={`/people/${person.address}`}>
                  <span className="mt-2 inline-block"><StatusPill status="connected">Connected</StatusPill></span>
                  <p className="mt-1 text-sm">
                    <Link href="/messages" className={textLinkClasses}>Go to messages</Link>
                  </p>
                </PersonRow>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10" aria-labelledby="sent-heading">
        <h2 id="sent-heading" className="text-3xl">
          Sent by you
        </h2>

        {sent.length === 0 ? (
          <div className="mt-3" data-testid="no-sent">
            <StateMessage title="You haven't asked anyone to connect yet.">
              Find someone on the{" "}
              <Link href="/graph" className={textLinkClasses}>
                graph
              </Link>
              .
            </StateMessage>
          </div>
        ) : (
          <ul className="mt-2 divide-y divide-line" data-testid="sent-list">
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
    // The shared PersonRow draws the silhouette and the alias (which wraps
    // rather than being cut off). No course is shown: this page's data has
    // never carried one.
    <PersonRow
      alias={request.alias}
      silhouette={request.silhouette}
      courseId={null}
      courseName={null}
    >
      <p className="mt-1">would like to connect.</p>
      <p className="text-sm">
        <Link href={`/people/${request.address}`} className={textLinkClasses}>
          View profile
        </Link>
      </p>

      <RequestActions requestId={request.requestId} alias={request.alias} />
    </PersonRow>
  );
}

// One request the viewer sent, with where it stands.
function SentRow({ request }: { request: SentRequest }) {
  return (
    <PersonRow
      alias={request.alias}
      silhouette={request.silhouette}
      courseId={null}
      courseName={null}
      href={`/people/${request.address}`}
    >
      {/* The status as a pill, with its word. The wrapper keeps the test id
          on an element whose text is exactly the status. */}
      <span className="mt-2 inline-block" data-testid="sent-status">
        <StatusPill status={request.status}>{statusSentence(request.status)}</StatusPill>
      </span>
      {/* A connection is where messaging starts (slice 6). */}
      {request.status === "connected" && (
        <p className="mt-1 text-sm">
          <Link href="/messages" className={textLinkClasses}>
            Go to messages
          </Link>
        </p>
      )}
    </PersonRow>
  );
}

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
