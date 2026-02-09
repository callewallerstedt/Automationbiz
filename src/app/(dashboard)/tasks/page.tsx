import { TasksBoard } from "@/components/tasks/tasks-board";
import { getTaskData } from "@/lib/data";

export default async function TasksPage() {
  const data = await getTaskData();

  return (
    <TasksBoard
      initialTasks={data.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate ? task.dueDate.toISOString() : null,
        assigneeId: task.assigneeId,
        assignee: { id: task.assignee.id, name: task.assignee.name },
        company: task.company ? { id: task.company.id, name: task.company.name } : null,
        project: task.project ? { id: task.project.id, name: task.project.name } : null,
      }))}
      users={data.users.map((user) => ({ id: user.id, name: user.name }))}
      companies={data.companies.map((company) => ({ id: company.id, name: company.name }))}
      projects={data.projects.map((project) => ({ id: project.id, name: project.name }))}
    />
  );
}

