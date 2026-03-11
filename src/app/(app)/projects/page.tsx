import Link from "next/link";
import type { Route } from "next";
import { ProjectStatus } from "@prisma/client";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ProjectCreateForm } from "@/components/projects/project-create-form";
import { ProjectStatusBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { projectStatusOptions } from "@/lib/constants";
import { listProjects } from "@/lib/data";
import { formatDateTime } from "@/lib/utils";

type ProjectsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProjectsPage({
  searchParams
}: ProjectsPageProps) {
  const params = (await searchParams) ?? {};
  const query = typeof params.q === "string" ? params.q : "";
  const rawStatus = typeof params.status === "string" ? params.status : "";
  const status = Object.values(ProjectStatus).includes(rawStatus as ProjectStatus)
    ? (rawStatus as ProjectStatus)
    : undefined;
  const projects = await listProjects({
    query,
    status
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Projects"
        title="Keep every delivery track visible."
        description="Search existing projects, filter by status, and add a new project without leaving the workspace."
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Panel className="space-y-4">
            <form className="grid gap-4 lg:grid-cols-[1fr_220px_auto]">
              <Input
                name="q"
                defaultValue={query}
                placeholder="Search by project name, code, or brief"
              />
              <Select name="status" defaultValue={status ?? ""}>
                <option value="">All statuses</option>
                {projectStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <Button type="submit" fullWidth={false}>
                Apply filters
              </Button>
            </form>
          </Panel>

          {projects.length === 0 ? (
            <EmptyState
              title="No matching projects"
              description="Try a broader search or create a new project from the panel beside the list."
            />
          ) : (
            <div className="grid gap-4">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}` as Route}
                  className="block"
                >
                  <Panel className="animate-fade-up space-y-4 transition hover:-translate-y-0.5 hover:bg-white/85">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <ProjectStatusBadge status={project.status} />
                        <div>
                          <h2 className="text-2xl font-semibold text-ink">
                            {project.name}
                          </h2>
                          <p className="mt-1 text-sm font-medium text-ink/65">
                            {project.code}
                          </p>
                        </div>
                        <p className="max-w-2xl text-sm leading-6 text-ink/70">
                          {project.description}
                        </p>
                      </div>
                      <div className="space-y-2 rounded-[1.5rem] bg-canvas/70 px-4 py-3 text-sm text-ink/70">
                        <p>{project._count.tasks} tasks</p>
                        <p>Owner: {project.owner.name}</p>
                        <p>Updated {formatDateTime(project.updatedAt)}</p>
                      </div>
                    </div>
                  </Panel>
                </Link>
              ))}
            </div>
          )}
        </div>

        <ProjectCreateForm />
      </div>
    </div>
  );
}
