import { signOutAction } from "@/app/actions/auth-actions";
import { NavLinks } from "@/components/layout/nav-links";
import { WorkspaceRoleBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { getAppShellData } from "@/lib/data";

export default async function AppLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const { membership, unreadNotifications, user, workspace } =
    await getAppShellData();

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-black/10 bg-white/55 p-4 shadow-panel backdrop-blur sm:p-6">
        <header className="flex flex-col gap-4 border-b border-black/10 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
              ops-tracker
            </p>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-6">
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold text-ink">
                  {workspace.name}
                </h1>
                <p className="text-sm text-ink/65">{workspace.description}</p>
              </div>
              <NavLinks
                role={membership.role}
                unreadCount={unreadNotifications}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="rounded-[1.5rem] bg-white/80 px-4 py-3 text-sm text-ink/80">
              <p className="font-semibold">{user.name}</p>
              <div className="mt-2">
                <WorkspaceRoleBadge role={membership.role} />
              </div>
            </div>
            <form action={signOutAction}>
              <Button type="submit" variant="secondary">
                Sign out
              </Button>
            </form>
          </div>
        </header>
        <main className="py-6">{children}</main>
      </div>
    </div>
  );
}
