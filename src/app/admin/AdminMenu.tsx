// The section menu shown at the top of every admin page (slice 8, #15,
// design 11). One shared component so a new section is added in one place.
//
// The Categories and Users links point at pages later groups of this slice
// build. Reports belongs to slice 9 (#16).

import Link from "next/link";

import { textLinkClasses } from "@/components/formStyles";

const SECTIONS = [
  { href: "/admin/categories", label: "Categories & tags" },
  { href: "/admin/courses", label: "Courses" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/reports", label: "Reports" }, // slice 9
];

export function AdminMenu() {
  return (
    // Wraps onto a second line on a narrow phone instead of scrolling sideways.
    <nav aria-label="Admin sections" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      <Link href="/admin" className={`inline-flex min-h-11 items-center font-bold ${textLinkClasses}`}>
        Admin
      </Link>
      {SECTIONS.map((section) => (
        <Link
          key={section.href}
          href={section.href}
          className={`inline-flex min-h-11 items-center ${textLinkClasses}`}
        >
          {section.label}
        </Link>
      ))}
    </nav>
  );
}
