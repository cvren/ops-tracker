import { signOutAction } from "@/app/actions/auth-actions";
import { NavLinks } from "@/components/layout/nav-links";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-black/10 bg-white/55 p-4 shadow-panel backdrop-blur sm:p-6">
        <header className="flex flex-col gap-4 border-b border-black/10 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
              ops-tracker
            </p>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-6">
              <h1 className="text-2xl font-semibold text-ink">
                Operations command surface
              </h1>
              <NavLinks />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-white/80 px-4 py-2 text-sm text-ink/80">
              {user.name}
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
