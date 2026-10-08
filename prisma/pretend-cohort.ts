// Builds the PRETEND COHORT as plain data: 32 pretend students with profiles,
// scores, connection requests, conversations and so on (foundation #7,
// design decisions 5 and 6).
//
// This file never touches the database. It only works out WHAT the cohort is;
// prisma/seed-fake.ts is the file that saves it. Keeping the two apart means
// the rules below ("nobody's glitch match is in their top 5", "every score
// adds up") can be tested in milliseconds without a database.
//
// THE SAME COHORT FOR EVERYONE. Nothing here uses Math.random() or today's
// date. Every "random" choice comes from a number generator that is started
// from a fixed text, so it produces the same choices on every laptop, on the
// preview site and in the tests. "Sign in as pretend-user-07" has to mean the
// same person for all five of us.
//
// Join-up (#17) deletes this file together with the seed and the switcher.

import { PRETEND_USER_ID_PREFIX } from "../src/lib/pretendCohort";
import { orderUserPair } from "../src/lib/userPair";

// ---------------------------------------------------------------------------
// What goes in: the part of the catalogue the cohort is built from
// ---------------------------------------------------------------------------

export type CohortTag = { id: string; name: string };

export type CohortCategory = {
  id: string;
  pickMin: number;
  pickMax: number;
  // Only tags that are in use (not retired), in display order.
  tags: CohortTag[];
};

export type CohortCatalogue = {
  // Only categories that are in use (not retired), in display order.
  categories: CohortCategory[];
  // The ids of the courses in use, in display order, e.g. ["software", "business"].
  courseIds: string[];
};

// ---------------------------------------------------------------------------
// What comes out: one list per database table
// ---------------------------------------------------------------------------

export type PretendCohort = {
  users: {
    id: string;
    email: string;
    role: "MEMBER" | "ADMIN";
    courseId: string;
    suspendedAt: Date | null;
    acceptedTermsAt: Date;
    createdAt: Date;
  }[];
  profiles: {
    userId: string;
    alias: string;
    silhouette: string;
    completedAt: Date;
  }[];
  profileTags: { userId: string; tagId: string }[];
  edges: {
    userAId: string;
    userBId: string;
    score: number;
    complement: number;
    overlap: number;
    tension: number;
  }[];
  glitchMatches: { userId: string; matchedUserId: string }[];
  connectionRequests: {
    id: string;
    fromUserId: string;
    toUserId: string;
    status: "PENDING" | "APPROVED" | "DECLINED";
    createdAt: Date;
  }[];
  conversations: {
    id: string;
    userAId: string;
    userBId: string;
    createdAt: Date;
    closedAt: Date | null;
  }[];
  messages: {
    id: string;
    conversationId: string;
    senderId: string;
    body: string;
    createdAt: Date;
  }[];
  blocks: { blockerId: string; blockedId: string; createdAt: Date }[];
  reports: {
    id: string;
    reporterId: string;
    reportedId: string;
    reason: string;
    status: "OPEN";
    createdAt: Date;
  }[];
};

// ---------------------------------------------------------------------------
// The shape of the cohort. Change a number here and the tests will tell you
// what else depends on it.
// ---------------------------------------------------------------------------

// Users 01 to 30 have finished profiles. 31 and 32 have signed up but not
// onboarded, so track 2 has someone to take through onboarding.
export const FINISHED_PROFILE_COUNT = 30;
export const TOTAL_USER_COUNT = 32;

// Special people. They are fixed numbers, not random, so the README and the
// tests can name them.
export const ADMIN_NUMBER = 1; // the one admin: can open /admin
export const MAIN_CHARACTER_NUMBER = 2; // has data for every feature (see below)
// Sends the main character their incoming request (see buildGlitchMatches).
const MAIN_CHARACTER_ADMIRER_NUMBER = 3;
export const SUSPENDED_NUMBER = 30; // suspended: must not show on the graph

// How many silhouette pictures slice 2 (#9) plans. We only store their ids;
// the picture files arrive with that slice.
const SILHOUETTE_COUNT = 12;

// Every date in the cohort is counted from this fixed moment, so that dates
// are the same for everyone too. (A date of "now" would differ on each run.)
const COHORT_START = new Date("2026-10-01T09:00:00.000Z");
const ONE_MINUTE = 60 * 1000;
const ONE_HOUR = 60 * ONE_MINUTE;

function minutesAfterStart(minutes: number): Date {
  return new Date(COHORT_START.getTime() + minutes * ONE_MINUTE);
}

// ---------------------------------------------------------------------------
// Ids
// ---------------------------------------------------------------------------

// 7 -> "07". Zero-padded so that sorting ids as text sorts them by number
// ("pretend-user-02" comes before "pretend-user-10").
function twoDigits(number: number): string {
  return String(number).padStart(2, "0");
}

// The id of pretend user number N, e.g. pretendUserId(7) -> "pretend-user-07".
export function pretendUserId(number: number): string {
  return `${PRETEND_USER_ID_PREFIX}${twoDigits(number)}`;
}

// "pretend-user-07" -> 7.
function userNumber(userId: string): number {
  return Number(userId.slice(PRETEND_USER_ID_PREFIX.length));
}

// ---------------------------------------------------------------------------
// Repeatable "random" numbers
// ---------------------------------------------------------------------------

// Turns any text into a whole number, always the same number for the same
// text. (This is the well-known "FNV-1a" recipe; the odd-looking constants
// come from it. We don't need to understand why they work, only that the
// same text always gives the same result.)
function numberFromText(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  // `>>> 0` keeps it a positive whole number.
  return hash >>> 0;
}

// Makes a function that returns a new number between 0 and 1 each time it is
// called, like Math.random(), except that the same `label` always produces
// the same sequence. (The recipe is called "mulberry32".)
//
// Why a label per decision (e.g. "tags:pretend-user-07:energy") instead of
// one generator for the whole cohort: each choice then depends only on its
// own label. Adding a category to the catalogue later doesn't shuffle
// everybody's picks in the other categories.
function repeatableRandom(label: string): () => number {
  let state = numberFromText(label);
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

// A whole number from min to max, both included.
function randomWholeNumber(random: () => number, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

// Which tags one pretend user picks in one category.
//
// Exported because prisma/seed-fake.ts also uses it to give existing pretend
// profiles picks in a category that was added to the catalogue later (for
// example Skills and Interests, which arrive with slice 2).
export function pickTagsFor(userId: string, category: CohortCategory): string[] {
  const random = repeatableRandom(`tags:${userId}:${category.id}`);

  // Never ask for more tags than the category has (only matters for a tiny
  // test catalogue, or a category whose tags have mostly been retired).
  const most = Math.min(category.pickMax, category.tags.length);
  const least = Math.min(category.pickMin, most);
  const howMany = randomWholeNumber(random, least, most);

  // Take tags out of a copy of the list one at a time, so the same tag can't
  // be picked twice.
  const remaining = [...category.tags];
  const picked: string[] = [];
  for (let pick = 0; pick < howMany; pick++) {
    const index = randomWholeNumber(random, 0, remaining.length - 1);
    picked.push(remaining[index].id);
    remaining.splice(index, 1);
  }
  return picked;
}

// "The Pretend Sea Captain 07": the word "Pretend" makes it obvious on a
// preview that this isn't a real student, the Energy tag gives it some
// flavour, and the number keeps every alias unique (the database insists on
// that). The real alias words arrive with slice 2.
function buildAlias(number: number, energyTagName: string | undefined): string {
  // The Energy tags are named like "Giving Sea Captain Energy". Dropping the
  // "Giving " at the front and the " Energy" at the end leaves "Sea Captain",
  // which reads better in a name. A tag not named that way is used whole.
  // "Student" is only used if the catalogue has no Energy category at all.
  const shortName = (energyTagName ?? "Student")
    .replace(/^Giving /, "")
    .replace(/ Energy$/, "");

  return `The Pretend ${shortName} ${twoDigits(number)}`;
}

// ---------------------------------------------------------------------------
// Scores
// ---------------------------------------------------------------------------

type Edge = PretendCohort["edges"][number];

// A made-up but believable score for every pair of finished profiles.
//
// The three parts are invented; the total is then worked out from them with
// the brief's real formula, so the numbers always agree with each other.
// Real scoring is slice 3's job: the graph and the top 5 only need plausible
// numbers to draw.
function buildEdges(finishedUserIds: string[]): Edge[] {
  const edges: Edge[] = [];

  for (let first = 0; first < finishedUserIds.length; first++) {
    for (let second = first + 1; second < finishedUserIds.length; second++) {
      // Stored once per pair, lower id first (see src/lib/userPair.ts).
      const pair = orderUserPair(finishedUserIds[first], finishedUserIds[second]);
      const random = repeatableRandom(`edge:${pair.userAId}:${pair.userBId}`);

      const complement = randomWholeNumber(random, 0, 3);
      const overlap = randomWholeNumber(random, 0, 2); // same Energy, same Vibe
      const tension = randomWholeNumber(random, 0, 1); // different Hero Story

      edges.push({
        ...pair,
        complement,
        overlap,
        tension,
        // The formula from collabz-mvp-brief.md.
        score: complement * 3 + overlap + tension,
      });
    }
  }
  return edges;
}

// For each user, everyone else ordered from their best score to their worst.
// Ties go to the lower user number, which is also who "finished their
// profile first" (the real tie-break rule from the overview design).
function rankEveryoneFor(
  finishedUserIds: string[],
  edges: Edge[],
): Map<string, string[]> {
  // First collect, for each user, the score with every other user.
  const scoresByUser = new Map<string, { otherId: string; score: number }[]>();
  for (const userId of finishedUserIds) {
    scoresByUser.set(userId, []);
  }
  for (const edge of edges) {
    scoresByUser.get(edge.userAId)!.push({ otherId: edge.userBId, score: edge.score });
    scoresByUser.get(edge.userBId)!.push({ otherId: edge.userAId, score: edge.score });
  }

  const ranking = new Map<string, string[]>();
  for (const [userId, scores] of scoresByUser) {
    scores.sort(
      (a, b) => b.score - a.score || userNumber(a.otherId) - userNumber(b.otherId),
    );
    ranking.set(
      userId,
      scores.map((entry) => entry.otherId),
    );
  }
  return ranking;
}

// The five people a user scores highest with. Exported for the tests.
export function topFiveFromRanking(ranking: Map<string, string[]>, userId: string): string[] {
  return (ranking.get(userId) ?? []).slice(0, 5);
}

// One glitch match per finished user: a random person who isn't themselves
// and isn't in their top 5 (overview design decision 9).
function buildGlitchMatches(
  finishedUserIds: string[],
  ranking: Map<string, string[]>,
): PretendCohort["glitchMatches"] {
  const mainCharacterId = pretendUserId(MAIN_CHARACTER_NUMBER);
  const admirerId = pretendUserId(MAIN_CHARACTER_ADMIRER_NUMBER);

  return finishedUserIds.map((userId) => {
    const topFive = topFiveFromRanking(ranking, userId);
    const candidates = finishedUserIds.filter(
      (otherId) => otherId !== userId && !topFive.includes(otherId),
    );

    // One deliberate exception to "random". The main character must have an
    // incoming request, and a request may only be sent to your top 5 or your
    // glitch match. So we make sure user 03 is allowed to send one to the
    // main character: if the main character isn't already in 03's top 5,
    // they become 03's glitch match. Either way the request is legitimate.
    if (userId === admirerId && candidates.includes(mainCharacterId)) {
      return { userId, matchedUserId: mainCharacterId };
    }

    const random = repeatableRandom(`glitch:${userId}`);
    const index = randomWholeNumber(random, 0, candidates.length - 1);
    return { userId, matchedUserId: candidates[index] };
  });
}

// ---------------------------------------------------------------------------
// Connection requests, conversations, messages, a block and a report
// ---------------------------------------------------------------------------

type ConnectionRequest = PretendCohort["connectionRequests"][number];

// A few short, friendly lines to put in conversations. Messages are the only
// free text in the app, so these stand in for what students might write.
const MESSAGE_LINES = [
  "Hi! We came up as a strong match. Fancy comparing project ideas?",
  "Definitely. I've got half an idea for an app and no one to build it with.",
  "Perfect, I've got the opposite problem. Coffee before Thursday's session?",
  "Yes! 10am by the main entrance?",
];

// The lines used in the conversation that ends in a block, so that slice 9
// has an example of a conversation that went badly.
const BLOCKED_MESSAGE_LINES = [
  "Hey, you never replied to my last three messages.",
  "I'd rather not carry on with this, sorry.",
];

function buildConnections(
  finishedUserIds: string[],
  ranking: Map<string, string[]>,
  glitchMatches: PretendCohort["glitchMatches"],
) {
  const mainCharacterId = pretendUserId(MAIN_CHARACTER_NUMBER);
  const admirerId = pretendUserId(MAIN_CHARACTER_ADMIRER_NUMBER);
  const suspendedId = pretendUserId(SUSPENDED_NUMBER);

  const connectionRequests: ConnectionRequest[] = [];

  // Remembers every pair that already has a request (in either direction),
  // so two people never have two requests between them.
  const pairsWithARequest = new Set<string>();
  const pairKey = (firstId: string, secondId: string) => {
    const pair = orderUserPair(firstId, secondId);
    return `${pair.userAId}|${pair.userBId}`;
  };

  function addRequest(
    fromUserId: string,
    toUserId: string,
    status: ConnectionRequest["status"],
  ) {
    const number = connectionRequests.length + 1;
    connectionRequests.push({
      id: `pretend-request-${twoDigits(number)}`,
      fromUserId,
      toUserId,
      status,
      // An hour apart, in the order they were made.
      createdAt: minutesAfterStart(24 * 60 + number * 60),
    });
    pairsWithARequest.add(pairKey(fromUserId, toUserId));
  }

  // The best-scoring person `fromUserId` could still send a request to:
  // in their top 5 (the real rule), not suspended, and not someone they
  // already share a request with.
  function bestAvailableTarget(fromUserId: string): string | undefined {
    return topFiveFromRanking(ranking, fromUserId).find(
      (candidateId) =>
        candidateId !== suspendedId &&
        !pairsWithARequest.has(pairKey(fromUserId, candidateId)),
    );
  }

  // --- The main character (pretend-user-02) ---
  // Signing in as this one person shows every feature with data in it:

  // 1. An INCOMING pending request, from user 03. buildGlitchMatches() made
  //    sure 03 is allowed to send it (top 5 or glitch match).
  const admirersGlitchMatch = glitchMatches.find(
    (glitchMatch) => glitchMatch.userId === admirerId,
  )?.matchedUserId;
  const admirerMaySendIt =
    topFiveFromRanking(ranking, admirerId).includes(mainCharacterId) ||
    admirersGlitchMatch === mainCharacterId;
  if (admirerMaySendIt) {
    addRequest(admirerId, mainCharacterId, "PENDING");
  }

  // 2. An OUTGOING pending request, to the best match they can still ask.
  const outgoingTarget = bestAvailableTarget(mainCharacterId);
  if (outgoingTarget) {
    addRequest(mainCharacterId, outgoingTarget, "PENDING");
  }

  // 3. An APPROVED request, which gives them an open conversation.
  const connectedTarget = bestAvailableTarget(mainCharacterId);
  if (connectedTarget) {
    addRequest(mainCharacterId, connectedTarget, "APPROVED");
  }

  // --- Everyone else ---
  // Users 04 onwards each send one request to their best available match,
  // until we have 8 pending, 4 approved and 2 declined in total (the three
  // above included). The statuses are handed out in this fixed order.
  const remainingStatuses: ConnectionRequest["status"][] = [
    "APPROVED",
    "PENDING",
    "DECLINED",
    "PENDING",
    "APPROVED",
    "PENDING",
    "PENDING",
    "DECLINED",
    "PENDING",
    "PENDING",
    "APPROVED",
  ];
  const otherSenders = finishedUserIds.filter(
    (userId) =>
      userNumber(userId) > MAIN_CHARACTER_ADMIRER_NUMBER && userId !== suspendedId,
  );
  for (const senderId of otherSenders) {
    const status = remainingStatuses.shift();
    if (!status) break; // all fourteen made
    const targetId = bestAvailableTarget(senderId);
    if (targetId) {
      addRequest(senderId, targetId, status);
    } else {
      // Very unlikely, but if this sender has nobody left to ask, keep the
      // status for the next sender rather than losing it.
      remainingStatuses.unshift(status);
    }
  }

  // --- Conversations: one for every approved request ---
  const approvedRequests = connectionRequests.filter(
    (request) => request.status === "APPROVED",
  );
  // The LAST approved pair is the one that fell out: their conversation is
  // closed, one of them blocked the other, and reported them.
  const fallenOutRequest = approvedRequests[approvedRequests.length - 1];

  const conversations: PretendCohort["conversations"] = [];
  const messages: PretendCohort["messages"] = [];

  approvedRequests.forEach((request, index) => {
    const conversationId = `pretend-conversation-${twoDigits(index + 1)}`;
    const fellOut = request === fallenOutRequest;
    // The conversation opened an hour after the request was sent.
    const openedAt = new Date(request.createdAt.getTime() + ONE_HOUR);

    const lines = fellOut ? BLOCKED_MESSAGE_LINES : MESSAGE_LINES;
    lines.forEach((body, lineIndex) => {
      messages.push({
        id: `${conversationId}-message-${twoDigits(lineIndex + 1)}`,
        conversationId,
        // The two people take turns, starting with whoever sent the request.
        senderId: lineIndex % 2 === 0 ? request.fromUserId : request.toUserId,
        body,
        createdAt: new Date(openedAt.getTime() + (lineIndex + 1) * 5 * ONE_MINUTE),
      });
    });

    conversations.push({
      id: conversationId,
      ...orderUserPair(request.fromUserId, request.toUserId),
      createdAt: openedAt,
      // Closed an hour after the last message, when the block happened.
      closedAt: fellOut ? new Date(openedAt.getTime() + 2 * ONE_HOUR) : null,
    });
  });

  // --- One block and one open report, between the pair that fell out ---
  const blocks: PretendCohort["blocks"] = [];
  const reports: PretendCohort["reports"] = [];
  if (fallenOutRequest) {
    const blockedAt = new Date(fallenOutRequest.createdAt.getTime() + 3 * ONE_HOUR);
    // The person who received the request is the one who blocks and reports.
    blocks.push({
      blockerId: fallenOutRequest.toUserId,
      blockedId: fallenOutRequest.fromUserId,
      createdAt: blockedAt,
    });
    reports.push({
      id: "pretend-report-01",
      reporterId: fallenOutRequest.toUserId,
      reportedId: fallenOutRequest.fromUserId,
      // An example reason from the safety spec. Slice 9 decides the real list.
      reason: "Inappropriate messages",
      status: "OPEN",
      createdAt: blockedAt,
    });
  }

  return { connectionRequests, conversations, messages, blocks, reports };
}

// ---------------------------------------------------------------------------
// Putting it all together
// ---------------------------------------------------------------------------

export function buildPretendCohort(catalogue: CohortCatalogue): PretendCohort {
  if (catalogue.courseIds.length === 0) {
    throw new Error("The pretend cohort needs at least one course in the catalogue.");
  }

  const users: PretendCohort["users"] = [];
  const profiles: PretendCohort["profiles"] = [];
  const profileTags: PretendCohort["profileTags"] = [];

  for (let number = 1; number <= TOTAL_USER_COUNT; number++) {
    const id = pretendUserId(number);
    // They "signed up" one minute apart, in number order.
    const signedUpAt = minutesAfterStart(number);

    users.push({
      id,
      // ".test" is a domain reserved for testing: it can never receive email,
      // so no real person can ever be emailed by mistake.
      email: `pretend-${twoDigits(number)}@collabz.test`,
      role: number === ADMIN_NUMBER ? "ADMIN" : "MEMBER",
      // Alternate between the courses, so both halves are the same size:
      // odd numbers get the first course, even numbers the second.
      courseId: catalogue.courseIds[(number - 1) % catalogue.courseIds.length],
      suspendedAt: number === SUSPENDED_NUMBER ? minutesAfterStart(48 * 60) : null,
      acceptedTermsAt: signedUpAt,
      createdAt: signedUpAt,
    });

    // Users after the 30th have signed up but not onboarded: no profile.
    if (number > FINISHED_PROFILE_COUNT) continue;

    let energyTagName: string | undefined;
    for (const category of catalogue.categories) {
      const pickedTagIds = pickTagsFor(id, category);
      for (const tagId of pickedTagIds) {
        profileTags.push({ userId: id, tagId });
      }
      if (category.id === "energy" && pickedTagIds.length > 0) {
        energyTagName = category.tags.find((tag) => tag.id === pickedTagIds[0])?.name;
      }
    }

    profiles.push({
      userId: id,
      alias: buildAlias(number, energyTagName),
      // Spread the 12 silhouettes evenly: 01, 02, ... 12, 01, 02, ...
      silhouette: `silhouette-${twoDigits(((number - 1) % SILHOUETTE_COUNT) + 1)}`,
      // Each finished onboarding half an hour after signing up. Because the
      // times are all different, "who finished first" is never a tie.
      completedAt: minutesAfterStart(number + 30),
    });
  }

  const finishedUserIds = profiles.map((profile) => profile.userId);
  const edges = buildEdges(finishedUserIds);
  const ranking = rankEveryoneFor(finishedUserIds, edges);
  const glitchMatches = buildGlitchMatches(finishedUserIds, ranking);
  const connections = buildConnections(finishedUserIds, ranking, glitchMatches);

  return { users, profiles, profileTags, edges, glitchMatches, ...connections };
}

// The top 5 of one pretend user, worked out from a built cohort's scores.
// Only the tests need this (to check the rules above held), but it lives here
// so there is one definition of "top 5" for the pretend cohort.
export function pretendTopFive(cohort: PretendCohort, userId: string): string[] {
  const finishedUserIds = cohort.profiles.map((profile) => profile.userId);
  return topFiveFromRanking(rankEveryoneFor(finishedUserIds, cohort.edges), userId);
}
