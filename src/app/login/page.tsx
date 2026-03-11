import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { Panel } from "@/components/ui/panel";
import { getCurrentUser } from "@/lib/auth";
import { getEnv } from "@/lib/env";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  const env = getEnv();
  const showDemoCredentials = process.env.NODE_ENV !== "production";

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-16">
      <div className="grid w-full gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Panel className="animate-fade-up overflow-hidden bg-ink px-8 py-10 text-canvas">
          <div className="space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sun">
              ops-tracker
            </p>
            <div className="max-w-2xl space-y-4">
              <h1 className="text-4xl font-semibold leading-tight sm:text-6xl">
                Run the ops control tower from one shared workspace.
              </h1>
              <p className="max-w-xl text-sm leading-7 text-canvas/75">
                Teams can sign in, route ownership, leave task context in
                comments, and clear review signals from an inbox instead of
                losing them in chat or memory.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.75rem] bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-canvas/55">
                  Handoff
                </p>
                <p className="mt-2 text-lg font-semibold">Owner → review → done</p>
              </div>
              <div className="rounded-[1.75rem] bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-canvas/55">
                  Trace
                </p>
                <p className="mt-2 text-lg font-semibold">Comments + timeline</p>
              </div>
              <div className="rounded-[1.75rem] bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-canvas/55">
                  Inbox
                </p>
                <p className="mt-2 text-lg font-semibold">Unread task signals</p>
              </div>
            </div>
          </div>
        </Panel>
        <Panel className="animate-fade-up space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
              Sign in
            </p>
            <h2 className="text-3xl font-semibold text-ink">
              Access the ops control tower
            </h2>
            <p className="text-sm leading-6 text-ink/70">
              Use one of the seeded collaboration accounts below after running
              the seed script.
            </p>
          </div>
          <LoginForm />
          {showDemoCredentials ? (
            <div className="rounded-[1.75rem] border border-black/10 bg-canvas/75 p-4 text-sm text-ink/75">
              <p className="font-semibold text-ink">Demo accounts</p>
              <div className="mt-2 space-y-2">
                <p>Admin: {env.OPS_TRACKER_DEMO_EMAIL}</p>
                <p>Operator: {env.OPS_TRACKER_SECONDARY_EMAIL}</p>
                <p>Reviewer: {env.OPS_TRACKER_TERTIARY_EMAIL}</p>
                <p>Password: {env.OPS_TRACKER_DEMO_PASSWORD}</p>
              </div>
            </div>
          ) : null}
        </Panel>
      </div>
    </main>
  );
}
