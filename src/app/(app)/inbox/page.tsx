import Link from "next/link";
import type { Route } from "next";

import {
  markAllNotificationsReadAction,
  markNotificationReadAction
} from "@/app/actions/notification-actions";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { getInboxNotifications } from "@/lib/data";
import { formatDateTime } from "@/lib/utils";

export default async function InboxPage() {
  const notifications = await getInboxNotifications();
  const unreadCount = notifications.filter(
    (notification) => notification.readAt === null
  ).length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Inbox"
        title="Track the work that needs your attention."
        description="Assignments, review requests, comments, mentions, and rework all land here with a direct link back to the task."
        action={
          unreadCount > 0 ? (
            <form action={markAllNotificationsReadAction}>
              <Button type="submit" variant="secondary">
                Mark all read
              </Button>
            </form>
          ) : null
        }
      />

      {notifications.length === 0 ? (
        <EmptyState
          title="Inbox is clear"
          description="Notifications appear here when tasks are assigned, reviewed, commented on, or mentioned."
        />
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => {
            const href = notification.activityEvent.task
              ? (`/tasks/${notification.activityEvent.task.id}${
                  notification.activityEvent.commentId
                    ? `#comment-${notification.activityEvent.commentId}`
                    : `#activity-${notification.activityEvent.id}`
                }` as Route)
              : notification.activityEvent.project
                ? (`/projects/${notification.activityEvent.project.id}` as Route)
                : ("/dashboard" as Route);

            return (
              <Panel
                key={notification.id}
                className={`space-y-4 ${
                  notification.readAt === null
                    ? "border-sky-200 bg-sky-50/60"
                    : "bg-canvas/80"
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {notification.readAt === null ? (
                        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-900">
                          Unread
                        </span>
                      ) : (
                        <span className="rounded-full bg-stone-200 px-3 py-1 text-xs font-semibold text-stone-800">
                          Read
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-ink">
                      {notification.activityEvent.actor?.name ?? "System"}
                    </p>
                    {notification.activityEvent.task ? (
                      <p className="text-sm font-semibold text-ink/80">
                        {notification.activityEvent.task.title}
                      </p>
                    ) : null}
                    {notification.activityEvent.project ? (
                      <p className="text-xs text-ink/55">
                        {notification.activityEvent.project.code} ·{" "}
                        {notification.activityEvent.project.name}
                      </p>
                    ) : null}
                    <p className="text-sm leading-6 text-ink/75">
                      {notification.summary ?? "Updated the workspace"}
                    </p>
                    <p className="text-xs text-ink/55">
                      {formatDateTime(notification.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={href}
                      className="inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-4 py-2 text-sm font-semibold text-canvas transition hover:-translate-y-0.5"
                    >
                      Open item
                    </Link>
                    {notification.readAt === null ? (
                      <form
                        action={markNotificationReadAction.bind(
                          null,
                          notification.id
                        )}
                      >
                        <Button type="submit" variant="secondary">
                          Mark read
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
