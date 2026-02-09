import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PRIORITY_COLORS, STAGE_COLORS, STAGE_LABELS } from "@/lib/constants";
import { getCompanyById } from "@/lib/data";

type CompanyPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CompanyDetailPage({ params }: CompanyPageProps) {
  const { id } = await params;
  const company = await getCompanyById(id);

  if (!company) {
    notFound();
  }

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{company.name}</CardTitle>
            <CardDescription className="mt-1">
              {company.industry} - {company.location}
            </CardDescription>
            <p className="mt-2 text-sm text-zinc-300">Owner: {company.owner.name}</p>
            <p className="text-sm text-zinc-400">Pain points: {company.painPoints}</p>
          </div>
          <div className="space-y-2 text-right">
            <Badge className={STAGE_COLORS[company.stage]}>{STAGE_LABELS[company.stage]}</Badge>
            <p className="text-xs text-zinc-500">Next action: {company.nextActionDate ? format(company.nextActionDate, "yyyy-MM-dd") : "Not set"}</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardTitle className="mb-3">Interaction Timeline</CardTitle>
          <div className="space-y-3">
            {company.interactions.length ? (
              company.interactions.map((interaction) => (
                <div key={interaction.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                  <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
                    <span>{interaction.type}</span>
                    <span>{format(interaction.occurredAt, "yyyy-MM-dd")}</span>
                  </div>
                  <p className="text-sm text-zinc-200">{interaction.summary}</p>
                  <p className="mt-1 text-xs text-zinc-500">By {interaction.createdBy.name}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-500">No interactions logged.</p>
            )}
          </div>
        </Card>

        <Card>
          <CardTitle className="mb-3">Open Tasks</CardTitle>
          <div className="space-y-2">
            {company.tasks.length ? (
              company.tasks.map((task) => (
                <div key={task.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-zinc-100">{task.title}</p>
                    <Badge className={PRIORITY_COLORS[task.priority]}>{task.priority}</Badge>
                  </div>
                  <p className="text-xs text-zinc-400">Status: {task.status.replace("_", " ")}</p>
                  <p className="text-xs text-zinc-500">Assignee: {task.assignee.name}</p>
                  <p className="text-xs text-zinc-500">Due: {task.dueDate ? format(task.dueDate, "yyyy-MM-dd") : "No date"}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-500">No tasks open.</p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardTitle className="mb-3">Linked Projects</CardTitle>
          <div className="space-y-2">
            {company.projects.length ? (
              company.projects.map((project) => (
                <div key={project.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                  <p className="text-sm font-semibold text-zinc-100">{project.name}</p>
                  <p className="text-xs text-zinc-400">{project.description}</p>
                  <p className="mt-1 text-xs text-zinc-500">Deadline: {format(project.deadline, "yyyy-MM-dd")}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-500">No projects linked.</p>
            )}
          </div>
        </Card>

        <Card>
          <CardTitle className="mb-3">Files and Links</CardTitle>
          <div className="space-y-2">
            {company.links.length ? (
              company.links.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-sm text-sky-300 hover:bg-zinc-800"
                >
                  {link.label}
                </a>
              ))
            ) : (
              <p className="text-sm text-zinc-500">No files/links added.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

