"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  type DraggableAttributes,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { TaskPriority, TaskStatus } from "@prisma/client";
import { format } from "date-fns";
import { MoreHorizontal, Pencil, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PRIORITY_COLORS, TASK_STATUSES, TASK_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

type TaskItem = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assigneeId: string;
  assignee: { id: string; name: string };
  company: { id: string; name: string } | null;
  project: { id: string; name: string } | null;
};

type Option = { id: string; name: string };

type TaskMenuProps = {
  task: TaskItem;
  onRename: (task: TaskItem) => void;
  onEdit: (task: TaskItem) => void;
  onDelete: (task: TaskItem) => void;
};

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="frost-pane mx-auto mt-20 max-w-xl rounded-2xl p-4" onClick={(event) => event.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
          <button type="button" className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-zinc-100" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function TaskMenu({ task, onRename, onEdit, onDelete }: TaskMenuProps) {
  return (
    <details className="group relative">
      <summary
        onPointerDown={(event) => event.stopPropagation()}
        className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-zinc-100"
      >
        <MoreHorizontal className="h-4 w-4" />
      </summary>
      <div className="frost-pane absolute right-0 top-9 z-30 w-40 rounded-xl p-1.5 shadow-xl">
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onRename(task)}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-zinc-200 hover:bg-white/10"
        >
          <Pencil className="h-3.5 w-3.5" />
          Rename
        </button>
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onEdit(task)}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-zinc-200 hover:bg-white/10"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onDelete(task)}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-zinc-200 hover:bg-white/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>
    </details>
  );
}

function TaskCard({
  task,
  dragging,
  listeners,
  attributes,
  setNodeRef,
  style,
  onRename,
  onEdit,
  onDelete,
}: {
  task: TaskItem;
  dragging?: boolean;
  listeners?: ReturnType<typeof useDraggable>["listeners"];
  attributes?: DraggableAttributes;
  setNodeRef?: (node: HTMLElement | null) => void;
  style?: React.CSSProperties;
  onRename: (task: TaskItem) => void;
  onEdit: (task: TaskItem) => void;
  onDelete: (task: TaskItem) => void;
}) {
  return (
    <Card
      ref={setNodeRef as never}
      style={style}
      className={cn("cursor-grab p-3 shadow-none will-change-transform", dragging && "cursor-grabbing opacity-50")}
      {...(listeners ?? {})}
      {...(attributes ?? {})}
    >
      <div className="mb-2 flex items-start justify-end gap-2">
        <TaskMenu task={task} onRename={onRename} onEdit={onEdit} onDelete={onDelete} />
      </div>

      <div className="mb-2 flex items-center justify-between gap-2">
        <Link href={`/tasks/${task.id}`} className="text-sm font-semibold text-zinc-100 hover:text-white">
          {task.title}
        </Link>
        <Badge className={PRIORITY_COLORS[task.priority]}>{task.priority}</Badge>
      </div>
      <p className="text-xs text-zinc-400">{task.description || "No description"}</p>
      <p className="mt-2 text-xs text-zinc-300">Assignee: {task.assignee.name}</p>
      <p className="text-xs text-zinc-500">Due: {task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : "No date"}</p>
      {task.company ? <p className="text-xs text-zinc-500">Company: {task.company.name}</p> : null}
    </Card>
  );
}

function DraggableTaskCard({
  task,
  onRename,
  onEdit,
  onDelete,
}: {
  task: TaskItem;
  onRename: (task: TaskItem) => void;
  onEdit: (task: TaskItem) => void;
  onDelete: (task: TaskItem) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { status: task.status },
  });

  return (
    <TaskCard
      task={task}
      dragging={isDragging}
      listeners={listeners}
      attributes={attributes}
      setNodeRef={setNodeRef as (node: HTMLElement | null) => void}
      style={{ transform: CSS.Translate.toString(transform) }}
      onRename={onRename}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
}

function TaskColumn({ status, children }: { status: TaskStatus; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "frost-pane min-h-80 rounded-2xl p-3 transition duration-200",
        isOver && "bg-white/16",
      )}
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">{TASK_STATUS_LABELS[status]}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

export function TasksBoard({
  initialTasks,
  users,
  companies,
  projects,
}: {
  initialTasks: TaskItem[];
  users: Option[];
  companies: Option[];
  projects: Option[];
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [assigneeId, setAssigneeId] = useState(users[0]?.id ?? "");
  const [companyId, setCompanyId] = useState("");
  const [projectId, setProjectId] = useState("");

  const [renameTask, setRenameTask] = useState<TaskItem | null>(null);
  const [renameTitle, setRenameTitle] = useState("");

  const [editTask, setEditTask] = useState<TaskItem | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editPriority, setEditPriority] = useState<TaskPriority>("MEDIUM");
  const [editAssigneeId, setEditAssigneeId] = useState("");
  const [editCompanyId, setEditCompanyId] = useState("");
  const [editProjectId, setEditProjectId] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const grouped = useMemo(() => {
    return TASK_STATUSES.reduce((acc, status) => {
      acc[status] = tasks.filter((task) => task.status === status);
      return acc;
    }, {} as Record<TaskStatus, TaskItem[]>);
  }, [tasks]);

  const activeTask = useMemo(() => (activeTaskId ? tasks.find((task) => task.id === activeTaskId) ?? null : null), [activeTaskId, tasks]);

  const patchTask = async (taskId: string, payload: Record<string, unknown>) => {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) return null;
    return (await response.json()) as TaskItem;
  };

  const openRename = (task: TaskItem) => {
    setRenameTask(task);
    setRenameTitle(task.title);
  };

  const openEdit = (task: TaskItem) => {
    setEditTask(task);
    setEditDescription(task.description ?? "");
    setEditDueDate(task.dueDate ? task.dueDate.slice(0, 10) : "");
    setEditPriority(task.priority);
    setEditAssigneeId(task.assigneeId);
    setEditCompanyId(task.company?.id ?? "");
    setEditProjectId(task.project?.id ?? "");
  };

  const onSaveRename = async () => {
    if (!renameTask || !renameTitle.trim()) return;
    const updated = await patchTask(renameTask.id, { title: renameTitle.trim() });
    if (updated) {
      setTasks((prev) => prev.map((item) => (item.id === renameTask.id ? updated : item)));
    }
    setRenameTask(null);
  };

  const onSaveEdit = async () => {
    if (!editTask) return;

    const updated = await patchTask(editTask.id, {
      description: editDescription,
      dueDate: editDueDate || null,
      priority: editPriority,
      assigneeId: editAssigneeId,
      companyId: editCompanyId || null,
      projectId: editProjectId || null,
    });

    if (updated) {
      setTasks((prev) => prev.map((item) => (item.id === editTask.id ? updated : item)));
    }
    setEditTask(null);
  };

  const onDelete = async (task: TaskItem) => {
    if (!window.confirm(`Delete task '${task.title}'?`)) return;
    const response = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    if (!response.ok) return;
    setTasks((prev) => prev.filter((item) => item.id !== task.id));
  };

  const onDragStart = (event: DragStartEvent) => {
    setActiveTaskId(event.active.id as string);
  };

  const onDragCancel = () => {
    setActiveTaskId(null);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const destination = event.over?.id as TaskStatus | undefined;
    const taskId = event.active.id as string;
    setActiveTaskId(null);

    if (!destination) return;

    const current = tasks.find((task) => task.id === taskId);
    if (!current || current.status === destination) return;

    setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, status: destination } : task)));

    startTransition(async () => {
      await fetch(`/api/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: destination }),
      });
    });
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
        dueDate: dueDate || null,
        priority,
        assigneeId,
        companyId: companyId || null,
        projectId: projectId || null,
      }),
    });

    const created = (await response.json()) as TaskItem;
    setTasks((prev) => [created, ...prev]);
    setTitle("");
    setDescription("");
    setDueDate("");
  };

  return (
    <div className="space-y-5">
      <Card>
        <form onSubmit={createTask} className="grid gap-3 lg:grid-cols-6">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Add task title" className="lg:col-span-2" />
          <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          <Select value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="URGENT">URGENT</option>
          </Select>
          <Select value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </Select>
          <Button type="submit">Create Task</Button>

          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Description"
            className="min-h-20 lg:col-span-2"
          />
          <Select value={companyId} onChange={(event) => setCompanyId(event.target.value)}>
            <option value="">No Company</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </Select>
          <Select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            <option value="">No Project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
          <div className="flex items-center justify-end gap-2 lg:col-span-2">
            <Button type="button" variant={view === "kanban" ? "default" : "outline"} onClick={() => setView("kanban")}>
              Kanban
            </Button>
            <Button type="button" variant={view === "list" ? "default" : "outline"} onClick={() => setView("list")}>
              List
            </Button>
          </div>
        </form>
      </Card>

      {view === "kanban" ? (
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragCancel={onDragCancel} onDragEnd={onDragEnd}>
          <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
            {TASK_STATUSES.map((status) => (
              <TaskColumn key={status} status={status}>
                {grouped[status].map((task) => (
                  <DraggableTaskCard key={task.id} task={task} onRename={openRename} onEdit={openEdit} onDelete={onDelete} />
                ))}
              </TaskColumn>
            ))}
          </div>

          <DragOverlay>
            {activeTask ? (
              <div className="w-72">
                <TaskCard task={activeTask} dragging onRename={openRename} onEdit={openEdit} onDelete={onDelete} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <Card className="overflow-visible p-0">
          <table className="w-full text-left text-sm">
            <thead className="frost-pane-soft text-zinc-400">
              <tr>
                <th className="px-4 py-3">Task</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Assignee</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id} className="text-zinc-200">
                  <td className="px-4 py-3">
                    <Link href={`/tasks/${task.id}`} className="hover:text-white">
                      {task.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">{task.description || "-"}</td>
                  <td className="px-4 py-3">{TASK_STATUS_LABELS[task.status]}</td>
                  <td className="px-4 py-3">
                    <Badge className={PRIORITY_COLORS[task.priority]}>{task.priority}</Badge>
                  </td>
                  <td className="px-4 py-3">{task.assignee.name}</td>
                  <td className="px-4 py-3">{task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : "No date"}</td>
                  <td className="px-4 py-3">
                    <TaskMenu task={task} onRename={openRename} onEdit={openEdit} onDelete={onDelete} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {renameTask ? (
        <ModalShell title="Rename Task" onClose={() => setRenameTask(null)}>
          <div className="space-y-3">
            <Input value={renameTitle} onChange={(event) => setRenameTitle(event.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRenameTask(null)}>
                Cancel
              </Button>
              <Button onClick={onSaveRename}>Save</Button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {editTask ? (
        <ModalShell title="Edit Task" onClose={() => setEditTask(null)}>
          <div className="grid gap-3 md:grid-cols-2">
            <Textarea value={editDescription} onChange={(event) => setEditDescription(event.target.value)} className="min-h-24 md:col-span-2" />
            <Input type="date" value={editDueDate} onChange={(event) => setEditDueDate(event.target.value)} />
            <Select value={editPriority} onChange={(event) => setEditPriority(event.target.value as TaskPriority)}>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="URGENT">URGENT</option>
            </Select>
            <Select value={editAssigneeId} onChange={(event) => setEditAssigneeId(event.target.value)}>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </Select>
            <Select value={editCompanyId} onChange={(event) => setEditCompanyId(event.target.value)}>
              <option value="">No Company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </Select>
            <Select value={editProjectId} onChange={(event) => setEditProjectId(event.target.value)} className="md:col-span-2">
              <option value="">No Project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
            <div className="flex justify-end gap-2 md:col-span-2">
              <Button variant="ghost" onClick={() => setEditTask(null)}>
                Cancel
              </Button>
              <Button onClick={onSaveEdit}>Save</Button>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
}
