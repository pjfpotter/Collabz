// HOW A MESSAGE'S TIME IS SHOWN (slice 6, #13).
//
// One function, so the list and the conversation say times the same way.
//
// WHY A FIXED TIME ZONE: these pages are drawn on the server, which doesn't
// know where the reader is. Without one the time would come out in whatever
// zone the server runs in (UTC on Vercel), and a message sent at 5pm would
// read "4pm" for half the year. The cohort is in the UK, so we use London
// time and say so here. If the course ever runs elsewhere, change it here.
const MESSAGE_TIME_ZONE = "Europe/London";

// e.g. "14 Oct 2026, 15:42"
export function formatMessageTime(when: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: MESSAGE_TIME_ZONE,
  }).format(when);
}
