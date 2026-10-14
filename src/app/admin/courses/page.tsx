// /admin/courses - add, rename, reorder and retire courses (slice 8, #15).
//
// A Server Component with plain forms: each button posts to a Server Action
// in actions.ts, which does the change and comes back here.

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/currentUser";

import { AdminMenu } from "../AdminMenu";
import {
  addCourseAction,
  moveCourseAction,
  renameCourseAction,
  setCourseRetiredAction,
} from "./actions";

export const metadata = {
  title: "Courses · Admin · Collabz",
};

// Always read fresh, so a change shows straight away (same reason as
// /catalogue).
export const dynamic = "force-dynamic";

export default async function AdminCoursesPage({
  searchParams,
}: PageProps<"/admin/courses">) {
  // Admins only, and the FIRST line (see src/app/admin/page.tsx).
  await requireAdmin();

  // ?problem=... comes from an action that refused a change.
  const { problem } = await searchParams;
  const problemText = typeof problem === "string" ? problem : null;

  // Every course, retired ones included, so an admin can un-retire.
  const courses = await prisma.course.findMany({
    orderBy: [{ order: "asc" }, { id: "asc" }],
    include: { _count: { select: { users: true } } },
  });

  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <AdminMenu />

      <h1 className="mt-6 text-3xl font-semibold">Courses</h1>
      <p className="mt-2 text-sm">
        A retired course is no longer offered on the sign-up form. People already on
        it keep it.
      </p>

      {problemText && (
        <p role="alert" className="mt-4 rounded border border-current p-3 text-sm">
          {problemText}
        </p>
      )}

      <ul className="mt-6 space-y-4">
        {courses.map((course, index) => (
          <li key={course.id} className="rounded border border-current/30 p-3">
            <p className="font-semibold">
              {course.name}
              {course.retiredAt && <span className="font-normal"> (retired)</span>}
            </p>
            <p className="text-sm">
              {course._count.users} {course._count.users === 1 ? "person" : "people"}
            </p>

            <form action={renameCourseAction} className="mt-2 flex gap-2">
              <input type="hidden" name="id" value={course.id} />
              <label className="sr-only" htmlFor={`name-${course.id}`}>
                New name for {course.name}
              </label>
              <input
                id={`name-${course.id}`}
                name="name"
                defaultValue={course.name}
                className="min-w-0 flex-1 rounded border border-current/40 px-2 py-1"
              />
              <button type="submit" className="rounded border border-current px-3 py-1">
                Rename
              </button>
            </form>

            <div className="mt-2 flex flex-wrap gap-2">
              <form action={moveCourseAction}>
                <input type="hidden" name="id" value={course.id} />
                <input type="hidden" name="direction" value="up" />
                <button
                  type="submit"
                  disabled={index === 0}
                  className="rounded border border-current px-3 py-1 disabled:opacity-40"
                >
                  Move up
                </button>
              </form>
              <form action={moveCourseAction}>
                <input type="hidden" name="id" value={course.id} />
                <input type="hidden" name="direction" value="down" />
                <button
                  type="submit"
                  disabled={index === courses.length - 1}
                  className="rounded border border-current px-3 py-1 disabled:opacity-40"
                >
                  Move down
                </button>
              </form>
              <form action={setCourseRetiredAction}>
                <input type="hidden" name="id" value={course.id} />
                <input
                  type="hidden"
                  name="retired"
                  value={course.retiredAt ? "false" : "true"}
                />
                <button type="submit" className="rounded border border-current px-3 py-1">
                  {course.retiredAt ? "Un-retire" : "Retire"}
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>

      <form action={addCourseAction} className="mt-8 flex gap-2">
        <label className="sr-only" htmlFor="new-course">
          Name of the new course
        </label>
        <input
          id="new-course"
          name="name"
          placeholder="New course name"
          className="min-w-0 flex-1 rounded border border-current/40 px-2 py-1"
        />
        <button type="submit" className="rounded border border-current px-3 py-1">
          Add course
        </button>
      </form>
    </main>
  );
}
