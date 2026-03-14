import { PageHeader } from "@/components/page-header";
import {
  WorkspaceRoleBadge
} from "@/components/status-badges";
import { EmptyState } from "@/components/empty-state";
import { Panel } from "@/components/ui/panel";
import { WorkspaceMemberAddForm } from "@/components/workspace/workspace-member-add-form";
import { WorkspaceMemberRoleForm } from "@/components/workspace/workspace-member-role-form";
import { getWorkspaceMembersData } from "@/lib/data";
import {
  canManageManagerConsole,
  canManageMemberships
} from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";
import { getCurrentWorkspaceContext } from "@/lib/workspace";

export default async function WorkspacePage() {
  const [{ membership, workspace }, { availableUsers, memberships }] =
    await Promise.all([getCurrentWorkspaceContext(), getWorkspaceMembersData()]);
  const canManageMembers = canManageMemberships(membership.role);
  const canAccessManagerConsole = canManageManagerConsole(membership.role);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Workspace"
        title="Manage the people behind the handoff."
        description="This single workspace is the collaboration boundary for projects, tasks, review routing, and read/write permissions."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Panel className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
            Workspace
          </p>
          <p className="text-2xl font-semibold text-ink">{workspace.name}</p>
          <p className="text-sm text-ink/65">{workspace.description}</p>
        </Panel>
        <Panel className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
            Members
          </p>
          <p className="text-2xl font-semibold text-ink">{memberships.length}</p>
          <p className="text-sm text-ink/65">Active in this workspace</p>
        </Panel>
        <Panel className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
            Your role
          </p>
          <WorkspaceRoleBadge role={membership.role} />
          <p className="text-sm text-ink/65">
            {canManageMembers
              ? "You can manage membership and all task flow."
              : canAccessManagerConsole
                ? "You can run the manager console, but workspace settings stay admin-controlled."
                : "You can view the membership model for this workspace."}
          </p>
        </Panel>
        <Panel className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
            Available users
          </p>
          <p className="text-2xl font-semibold text-ink">
            {availableUsers.length}
          </p>
          <p className="text-sm text-ink/65">
            Existing users not yet added here
          </p>
        </Panel>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
              Members
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">
              Workspace roster
            </h2>
          </div>
          {memberships.length === 0 ? (
            <EmptyState
              title="No workspace members"
              description="Seed or add users to make assignments and review routing available."
            />
          ) : (
            <div className="space-y-4">
              {memberships.map((member) => (
                <div
                  key={member.id}
                  className="rounded-[1.5rem] border border-black/10 bg-canvas/70 px-4 py-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <p className="text-lg font-semibold text-ink">
                        {member.user.name}
                      </p>
                      <p className="text-sm text-ink/65">{member.user.email}</p>
                      <div>
                        <WorkspaceRoleBadge role={member.role} />
                      </div>
                      <p className="text-xs text-ink/55">
                        Added {formatDateTime(member.createdAt)}
                        {member.addedBy
                          ? ` by ${member.addedBy.name}`
                          : ""}
                      </p>
                    </div>
                    {canManageMembers ? (
                      <div className="min-w-64">
                        <WorkspaceMemberRoleForm
                          membershipId={member.id}
                          currentRole={member.role}
                          memberEmail={member.user.email}
                          memberName={member.user.name}
                          disabled={member.userId === membership.userId}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {canManageMembers ? (
          availableUsers.length === 0 ? (
            <EmptyState
              title="No unassigned users"
              description="All known users already belong to this workspace."
            />
          ) : (
            <WorkspaceMemberAddForm users={availableUsers} />
          )
        ) : (
          <Panel className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
              Membership control
            </p>
            <h2 className="text-2xl font-semibold text-ink">Read-only view</h2>
            <p className="text-sm leading-6 text-ink/70">
              Only workspace admins can add members or change roles. Your current
              role still applies to task and project access across this workspace.
            </p>
          </Panel>
        )}
      </div>
    </div>
  );
}
