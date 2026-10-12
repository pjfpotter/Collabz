// Tests for the two answer routes (slice 5, #12, task 4.2): 401, 404, 409
// and 200 for both approve and decline, against the test database.
//
// The rules themselves are tested in answerRequest.test.ts. These tests check
// that each route is wired to them and answers with the right status.

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as approve } from "@/app/api/requests/[id]/approve/route";
import { POST as decline } from "@/app/api/requests/[id]/decline/route";
import { prisma } from "@/lib/db";
import {
  ANSWER_REFUSAL_MESSAGES,
  REQUEST_APPROVED_MESSAGE,
  REQUEST_DECLINED_MESSAGE,
} from "@/lib/requests/messages";

import { seedCatalogue } from "../../prisma/seed";
import { emptyDatabase } from "../helpers/database";
import { createPerson } from "../helpers/people";

// The routes ask getCurrentUser() who is signed in. The real one reads a
// browser cookie, which doesn't exist in a plain test, so the tests replace it
// with a stand-in that returns whoever `signedInAs.user` is set to. (The same
// trick slice 4's connect route tests use.)
const signedInAs: { user: { id: string } | null } = { user: null };
vi.mock("@/lib/currentUser", () => ({
  getCurrentUser: async () => signedInAs.user,
}));

beforeEach(async () => {
  signedInAs.user = null;
  await emptyDatabase(prisma);
  await seedCatalogue(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

// Calls a route the way Next.js would. `params` is a Promise in this version
// of Next.js, hence Promise.resolve.
//
// `route` is typed as "a function taking a request and { params }" rather than
// as typeof approve, because approve and decline have different RouteContext
// types (one per address) and a single type can't be both.
type RouteFunction = (
  request: Request,
  context: { params: Promise<{ id: string }> },
) => Promise<Response>;
async function call(route: RouteFunction, requestId: string): Promise<Response> {
  return route(new Request("http://localhost/api/requests/x", { method: "POST" }), {
    params: Promise.resolve({ id: requestId }),
  });
}

async function makePendingRequest() {
  const anna = await createPerson(prisma, "anna");
  const ben = await createPerson(prisma, "ben");
  const request = await prisma.connectionRequest.create({
    data: { fromUserId: anna, toUserId: ben, status: "PENDING" },
  });
  return { anna, ben, requestId: request.id };
}

describe("POST /api/requests/[id]/approve", () => {
  it("answers 401 when nobody is signed in, and changes nothing", async () => {
    const { requestId } = await makePendingRequest();

    const response = await call(approve, requestId);

    expect(response.status).toBe(401);
    const stored = await prisma.connectionRequest.findUniqueOrThrow({ where: { id: requestId } });
    expect(stored.status).toBe("PENDING");
  });

  it("answers 200, approves and opens the conversation for the person asked", async () => {
    const { ben, requestId } = await makePendingRequest();
    signedInAs.user = { id: ben };

    const response = await call(approve, requestId);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, message: REQUEST_APPROVED_MESSAGE });
    expect(await prisma.conversation.count()).toBe(1);
  });

  it("answers 404 for someone who wasn't asked, and for a request that doesn't exist", async () => {
    const { anna, requestId } = await makePendingRequest();
    signedInAs.user = { id: anna };

    const notYours = await call(approve, requestId);
    const missing = await call(approve, "no-such-request");

    expect(notYours.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(await notYours.json()).toEqual({
      ok: false,
      message: ANSWER_REFUSAL_MESSAGES["not-found"],
    });
    expect(await prisma.conversation.count()).toBe(0);
  });

  it("answers 409 when it has already been answered", async () => {
    const { ben, requestId } = await makePendingRequest();
    signedInAs.user = { id: ben };
    await call(approve, requestId);

    const second = await call(approve, requestId);

    expect(second.status).toBe(409);
    expect(await prisma.conversation.count()).toBe(1);
  });

  it("answers 409 when the sender has been suspended since", async () => {
    const { anna, ben, requestId } = await makePendingRequest();
    await prisma.user.update({ where: { id: anna }, data: { suspendedAt: new Date() } });
    signedInAs.user = { id: ben };

    const response = await call(approve, requestId);

    expect(response.status).toBe(409);
    expect(await prisma.conversation.count()).toBe(0);
  });
});

describe("POST /api/requests/[id]/decline", () => {
  it("answers 401 when nobody is signed in", async () => {
    const { requestId } = await makePendingRequest();

    const response = await call(decline, requestId);

    expect(response.status).toBe(401);
  });

  it("answers 200 and declines, opening no conversation", async () => {
    const { ben, requestId } = await makePendingRequest();
    signedInAs.user = { id: ben };

    const response = await call(decline, requestId);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, message: REQUEST_DECLINED_MESSAGE });
    const stored = await prisma.connectionRequest.findUniqueOrThrow({ where: { id: requestId } });
    expect(stored.status).toBe("DECLINED");
    expect(await prisma.conversation.count()).toBe(0);
  });

  it("answers 404 for the sender", async () => {
    const { anna, requestId } = await makePendingRequest();
    signedInAs.user = { id: anna };

    const response = await call(decline, requestId);

    expect(response.status).toBe(404);
  });

  it("answers 409 when it has already been approved", async () => {
    const { ben, requestId } = await makePendingRequest();
    signedInAs.user = { id: ben };
    await call(approve, requestId);

    const response = await call(decline, requestId);

    expect(response.status).toBe(409);
    const stored = await prisma.connectionRequest.findUniqueOrThrow({ where: { id: requestId } });
    expect(stored.status).toBe("APPROVED");
  });
});
