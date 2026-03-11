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
                Keep operations visible without leaving the browser.
              </h1>
              <p className="max-w-xl text-sm leading-7 text-canvas/75">
                Reviewers can sign in, create projects, capture tasks, shift
                task status, and verify a realistic delivery flow in under five
                minutes.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.75rem] bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-canvas/55">
                  Core flow
                </p>
                <p className="mt-2 text-lg font-semibold">List → detail → move</p>
              </div>
              <div className="rounded-[1.75rem] bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-canvas/55">
                  Auth
                </p>
                <p className="mt-2 text-lg font-semibold">DB-backed sessions</p>
              </div>
              <div className="rounded-[1.75rem] bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-canvas/55">
                  Demo
                </p>
                <p className="mt-2 text-lg font-semibold">Seeded accounts</p>
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
              Access the review workspace
            </h2>
            <p className="text-sm leading-6 text-ink/70">
              Use the seeded reviewer credentials below after running the seed
              script.
            </p>
          </div>
          <LoginForm />
          {showDemoCredentials ? (
            <div className="rounded-[1.75rem] border border-black/10 bg-canvas/75 p-4 text-sm text-ink/75">
              <p className="font-semibold text-ink">Demo account</p>
              <p className="mt-2">Email: {env.OPS_TRACKER_DEMO_EMAIL}</p>
              <p>Password: {env.OPS_TRACKER_DEMO_PASSWORD}</p>
            </div>
          ) : null}
        </Panel>
      </div>
    </main>
  );
}
