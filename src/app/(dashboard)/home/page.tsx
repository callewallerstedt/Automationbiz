import Link from "next/link";
import { format } from "date-fns";
import { ArrowRight, CalendarClock, CircleCheckBig, Handshake } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { HomeNextAi } from "@/components/home/home-next-ai";
import { HomeOpenTasks } from "@/components/tasks/home-open-tasks";
import { STAGE_COLORS, STAGE_LABELS } from "@/lib/constants";
import { getHomeData } from "@/lib/data";

export default async function HomePage() {
  const data = await getHomeData();

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <CardTitle>To-do Focus</CardTitle>
            <Link href="/tasks" className="text-xs text-sky-300 hover:text-sky-200">
              Open tasks
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {data.todoByOwner.map((entry) => (
              <div key={entry.user.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                <p className="mb-2 text-sm font-semibold text-zinc-100">{entry.user.name}</p>
                {entry.tasks.length ? (
                  <div className="space-y-2">
                    {entry.tasks.slice(0, 7).map((task) => (
                      <Link
                        key={task.id}
                        href={`/tasks/${task.id}`}
                        className="block rounded-lg bg-zinc-950/70 px-2 py-1.5 text-xs text-zinc-300 transition hover:bg-zinc-900"
                      >
                        <p className="font-medium text-zinc-200">{task.title}</p>
                        <p className="text-zinc-500">
                          Due {task.dueDate ? format(task.dueDate, "MMM d") : "No date"} {task.company ? `- ${task.company.name}` : ""}
                        </p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">No to-do tasks.</p>
                )}
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wider text-zinc-500">To-do Summary</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-100">{data.totalTodoCount}</p>
            <p className="text-xs text-zinc-400">Open to-do tasks</p>
            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
              <p className="text-sm font-semibold text-rose-300">{data.overdueTodoCount}</p>
              <p className="text-xs text-zinc-500">Overdue to-do items</p>
            </div>
          </Card>
          <HomeNextAi />
        </div>
      </section>

      <section>
        <HomeOpenTasks
          initialTasks={data.openTasks.map((task) => ({
            id: task.id,
            title: task.title,
            status: task.status,
            dueDate: task.dueDate ? task.dueDate.toISOString() : null,
            assigneeId: task.assigneeId,
            assignee: { id: task.assignee.id, name: task.assignee.name },
            company: task.company ? { id: task.company.id, name: task.company.name } : null,
          }))}
          users={data.assignableUsers}
          companies={data.companyList}
          meId={data.me?.id ?? null}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.pipelineSummary.map((entry) => (
          <Card key={entry.stage} className="p-4">
            <div className="flex items-center justify-between gap-3">
              <Badge className={STAGE_COLORS[entry.stage]}>{STAGE_LABELS[entry.stage]}</Badge>
              <p className="text-2xl font-semibold text-zinc-100">{entry.count}</p>
            </div>
          </Card>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <CardTitle>Follow Ups Due</CardTitle>
            <CalendarClock className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="space-y-2">
            {data.followUps.length ? (
              data.followUps.map((company) => (
                <Link
                  key={company.id}
                  href={`/companies/${company.id}`}
                  className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
                >
                  <span>{company.name}</span>
                  <span className="text-xs text-zinc-500">{company.owner.name}</span>
                </Link>
              ))
            ) : (
              <p className="text-sm text-zinc-500">No overdue follow ups.</p>
            )}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Handshake className="h-4 w-4 text-zinc-400" />
            <CardTitle>Active Projects</CardTitle>
          </div>
          <div className="space-y-3">
            {data.activeProjects.map((project) => (
              <div key={project.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                <p className="text-sm font-semibold text-zinc-100">{project.name}</p>
                <p className="text-xs text-zinc-400">{project.company.name}</p>
                <p className="mt-1 text-xs text-zinc-500">Deadline: {format(project.deadline, "yyyy-MM-dd")}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-5">
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <CircleCheckBig className="h-4 w-4 text-zinc-400" />
            <CardTitle>Fast Access</CardTitle>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Link href="/pipeline" className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-sm text-zinc-200 hover:bg-zinc-800">
              Company Kanban <ArrowRight className="ml-2 inline h-4 w-4" />
            </Link>
            <Link href="/demo-lab" className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-sm text-zinc-200 hover:bg-zinc-800">
              Demo Lab <ArrowRight className="ml-2 inline h-4 w-4" />
            </Link>
            <CardDescription className="md:col-span-2">Use command palette with Ctrl+K to jump and create records faster.</CardDescription>
          </div>
        </Card>
      </section>
    </div>
  );
}
