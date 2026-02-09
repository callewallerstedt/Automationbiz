import { notFound } from "next/navigation";
import { TaskWorkspace } from "@/components/tasks/task-workspace";
import { getTaskWorkspaceData } from "@/lib/data";

type TaskPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TaskPage({ params }: TaskPageProps) {
  const { id } = await params;
  const data = await getTaskWorkspaceData(id);

  if (!data.task) {
    notFound();
  }

  return (
    <TaskWorkspace
      initialTask={{
        id: data.task.id,
        title: data.task.title,
        description: data.task.description,
        notes: data.task.notes,
        status: data.task.status,
        priority: data.task.priority,
        dueDate: data.task.dueDate ? data.task.dueDate.toISOString() : null,
        assigneeId: data.task.assigneeId,
        assignee: { id: data.task.assignee.id, name: data.task.assignee.name },
        companyId: data.task.companyId,
        company: data.task.company ? { id: data.task.company.id, name: data.task.company.name } : null,
        projectId: data.task.projectId,
        project: data.task.project ? { id: data.task.project.id, name: data.task.project.name } : null,
      }}
      users={data.users.map((user) => ({ id: user.id, name: user.name }))}
      companies={data.companies.map((company) => ({ id: company.id, name: company.name }))}
      projects={data.projects.map((project) => ({ id: project.id, name: project.name }))}
    />
  );
}
