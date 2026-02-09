"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type OpenTask = {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
  assigneeId: string;
  assignee: { id: string; name: string };
  company: { id: string; name: string } | null;
};

type Option = { id: string; name: string };

export function HomeOpenTasks({
  initialTasks,
  users,
  companies,
  meId,
}: {
  initialTasks: OpenTask[];
  users: Option[];
  companies: Option[];
  meId: string | null;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState(meId ?? users[0]?.id ?? "");
  const [companyId, setCompanyId] = useState("");
  const [dueDate, setDueDate] = useState("");

  const usersById = useMemo(() => Object.fromEntries(users.map((user) => [user.id, user])), [users]);

  const patchAssignee = async (taskId: string, nextAssigneeId: string) => {
    setLoadingId(taskId);
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigneeId: nextAssigneeId }),
      });

      if (!response.ok) return;
      const updated = (await response.json()) as OpenTask;
      setTasks((prev) => prev.map((task) => (task.id === taskId ? updated : task)));
    } finally {
      setLoadingId(null);
    }
  };

  const createTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || !assigneeId) return;

    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        assigneeId,
        dueDate: dueDate || null,
        priority: "MEDIUM",
        companyId: companyId || null,
        projectId: null,
      }),
    });

    if (!response.ok) return;

    const created = (await response.json()) as {
      id: string;
      title: string;
      status: string;
      dueDate: string | null;
      assigneeId: string;
      assignee: { id: string; name: string };
      company: { id: string; name: string } | null;
    };

    setTasks((prev) => [created, ...prev]);
    setTitle("");
    setDescription("");
    setCompanyId("");
    setDueDate("");
    setShowCreate(false);
  };

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <CardTitle>Open Tasks</CardTitle>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowCreate((state) => !state)}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add Task
          </Button>
          <Link href="/tasks" className="text-xs text-sky-300 hover:text-sky-200">
            Go to tasks
          </Link>
        </div>
      </div>

      {showCreate ? (
        <form onSubmit={createTask} className="mb-3 grid gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 md:grid-cols-5">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Task title" className="md:col-span-2" />
          <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description" />
          <Select value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </Select>
          <Button type="submit">Create</Button>

          <Select value={companyId} onChange={(event) => setCompanyId(event.target.value)}>
            <option value="">No Company</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </Select>
          <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          <div className="md:col-span-3" />
        </form>
      ) : null}

      <div className="space-y-2">
        {tasks.map((task) => {
          const assigneeName = usersById[task.assigneeId]?.name ?? task.assignee.name;
          return (
            <div key={task.id} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2">
              <div>
                <Link href={`/tasks/${task.id}`} className="text-sm font-medium text-zinc-100 hover:text-sky-300">
                  {task.title}
                </Link>
                <p className="text-xs text-zinc-500">
                  {task.company ? `${task.company.name} - ` : ""}
                  {task.status.replace("_", " ")} - due {task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : "No date"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Select
                  value={task.assigneeId}
                  disabled={loadingId === task.id}
                  onChange={(event) => patchAssignee(task.id, event.target.value)}
                  className="h-8"
                >
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </Select>
                <span className="min-w-16 text-right text-xs text-zinc-500">{assigneeName}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
