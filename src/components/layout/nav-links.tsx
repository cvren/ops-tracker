"use client";

import Link from "next/link";
import type { Route } from "next";
import type { WorkspaceRole } from "@prisma/client";
import { usePathname } from "next/navigation";

import { canManageManagerConsole } from "@/lib/permissions";
import { cn } from "@/lib/utils";

function getLinks(role: WorkspaceRole) {
  if (canManageManagerConsole(role)) {
    return [
      { href: "/dashboard" as Route, label: "Dashboard" },
      { href: "/projects" as Route, label: "Projects" },
      { href: "/tasks" as Route, label: "Tasks" },
      { href: "/templates" as Route, label: "Templates" },
      { href: "/commitments" as Route, label: "Commitments" },
      { href: "/exceptions" as Route, label: "Exceptions" },
      { href: "/inbox" as Route, label: "Inbox" },
      { href: "/workspace" as Route, label: "Workspace" }
    ] satisfies ReadonlyArray<{ href: Route; label: string }>;
  }

  return [
    { href: "/dashboard" as Route, label: "Dashboard" },
    { href: "/projects" as Route, label: "Projects" },
    { href: "/tasks" as Route, label: "Tasks" },
    { href: "/inbox" as Route, label: "Inbox" },
    { href: "/workspace" as Route, label: "Workspace" }
  ] satisfies ReadonlyArray<{ href: Route; label: string }>;
}

export function NavLinks({
  role,
  unreadCount = 0
}: {
  role: WorkspaceRole;
  unreadCount?: number;
}) {
  const pathname = usePathname();
  const links = getLinks(role);

  return (
    <nav className="flex flex-wrap gap-2">
      {links.map((link) => {
        const active =
          pathname === link.href || pathname.startsWith(`${link.href}/`);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
              active
                ? "bg-ink text-canvas"
                : "bg-white/60 text-ink hover:bg-white"
            )}
          >
            <span>{link.label}</span>
            {link.href === "/inbox" && unreadCount > 0 ? (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-semibold",
                  active
                    ? "bg-canvas/15 text-canvas"
                    : "bg-ink text-canvas"
                )}
              >
                {unreadCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
