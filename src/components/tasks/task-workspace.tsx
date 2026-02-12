"use client";

import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TaskPriority, TaskStatus } from "@prisma/client";
import { ChevronDown, ChevronUp, Plus, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PRIORITY_COLORS, TASK_STATUS_LABELS } from "@/lib/constants";

type Option = { id: string; name: string };

type WorkspaceTask = {
  id: string;
  title: string;
  description: string | null;
  notes: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assigneeId: string;
  assignee: { id: string; name: string };
  companyId: string | null;
  company: { id: string; name: string } | null;
  projectId: string | null;
  project: { id: string; name: string } | null;
};

type Message = {
  role: "user" | "assistant";
  text: string;
};

type SaveState = "saved" | "saving" | "error";

type DetailsState = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  assigneeId: string;
  companyId: string;
  projectId: string;
};

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={key} className="font-semibold text-zinc-100">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <em key={key} className="italic text-zinc-200">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code key={key} className="rounded bg-white/12 px-1 py-0.5 text-[12px] text-zinc-100">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={key}>{part}</span>;
  });
}

function renderNotesPreview(text: string) {
  if (!text.trim()) {
    return <p className="text-sm text-zinc-500">Nothing to preview yet.</p>;
  }

  const lines = text.split(/\r?\n/);
  const nodes: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();

    if (!trimmed) {
      nodes.push(<div key={`space-${i}`} className="h-2" />);
      i += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !(lines[i] ?? "").trim().startsWith("```")) {
        codeLines.push(lines[i] ?? "");
        i += 1;
      }
      if (i < lines.length) i += 1;
      nodes.push(
        <pre key={`code-${i}`} className="frost-pane-soft overflow-x-auto rounded-lg p-3 text-xs text-zinc-100">
          <code>{codeLines.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    if (trimmed.startsWith("## ")) {
      nodes.push(
        <h3 key={`h-${i}`} className="text-lg font-semibold text-zinc-100">
          {renderInline(trimmed.slice(3), `h-${i}`)}
        </h3>,
      );
      i += 1;
      continue;
    }

    if (trimmed.startsWith("> ")) {
      nodes.push(
        <blockquote key={`q-${i}`} className="frost-pane-soft rounded-lg px-3 py-2 text-sm italic text-zinc-300">
          {renderInline(trimmed.slice(2), `q-${i}`)}
        </blockquote>,
      );
      i += 1;
      continue;
    }

    if (/^-\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^-\s+/.test((lines[i] ?? "").trim())) {
        items.push((lines[i] ?? "").trim().replace(/^-\s+/, ""));
        i += 1;
      }
      nodes.push(
        <ul key={`ul-${i}`} className="list-disc space-y-1 pl-5 text-sm text-zinc-300">
          {items.map((item, index) => (
            <li key={`li-${i}-${index}`}>{renderInline(item, `li-${i}-${index}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test((lines[i] ?? "").trim())) {
        items.push((lines[i] ?? "").trim().replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      nodes.push(
        <ol key={`ol-${i}`} className="list-decimal space-y-1 pl-5 text-sm text-zinc-300">
          {items.map((item, index) => (
            <li key={`oli-${i}-${index}`}>{renderInline(item, `oli-${i}-${index}`)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    const paragraphLines: string[] = [trimmed];
    i += 1;
    while (
      i < lines.length &&
      (lines[i] ?? "").trim() &&
      !((lines[i] ?? "").trim().startsWith("## ")) &&
      !((lines[i] ?? "").trim().startsWith("> ")) &&
      !((lines[i] ?? "").trim().startsWith("```")) &&
      !/^-\s+/.test((lines[i] ?? "").trim()) &&
      !/^\d+\.\s+/.test((lines[i] ?? "").trim())
    ) {
      paragraphLines.push((lines[i] ?? "").trim());
      i += 1;
    }

    nodes.push(
      <p key={`p-${i}`} className="text-sm leading-7 text-zinc-300">
        {renderInline(paragraphLines.join(" "), `p-${i}`)}
      </p>,
    );
  }

  return <div className="space-y-3">{nodes}</div>;
}

export function TaskWorkspace({
  initialTask,
  users,
  companies,
  projects,
}: {
  initialTask: WorkspaceTask;
  users: Option[];
  companies: Option[];
  projects: Option[];
}) {
  const [task, setTask] = useState(initialTask);
  const [notes, setNotes] = useState(initialTask.notes ?? "");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [chat, setChat] = useState<Message[]>([]);
  const [working, setWorking] = useState(false);
  const [notesSaveState, setNotesSaveState] = useState<SaveState>("saved");
  const [detailsSaveState, setDetailsSaveState] = useState<SaveState>("saved");
  const notesSavedRef = useRef(initialTask.notes ?? "");
  const notesRequestRef = useRef(0);
  const detailsRequestRef = useRef(0);

  const [details, setDetails] = useState<DetailsState>({
    title: initialTask.title,
    description: initialTask.description ?? "",
    status: initialTask.status,
    priority: initialTask.priority,
    dueDate: initialTask.dueDate ? initialTask.dueDate.slice(0, 10) : "",
    assigneeId: initialTask.assigneeId,
    companyId: initialTask.companyId ?? "",
    projectId: initialTask.projectId ?? "",
  });
  const detailsSavedRef = useRef(JSON.stringify(details));

  const saveTask = useCallback(async (payload: Record<string, unknown>) => {
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) return null;
      return (await response.json()) as WorkspaceTask;
    } catch {
      return null;
    }
  }, [task.id]);

  useEffect(() => {
    if (notes === notesSavedRef.current) return;

    setNotesSaveState("saving");
    const requestId = ++notesRequestRef.current;
    const timer = setTimeout(async () => {
      const updated = await saveTask({ notes });
      if (requestId !== notesRequestRef.current) return;

      if (!updated) {
        setNotesSaveState("error");
        return;
      }

      notesSavedRef.current = updated.notes ?? "";
      setTask(updated);
      setNotesSaveState("saved");
    }, 700);

    return () => clearTimeout(timer);
  }, [notes, saveTask, task.id]);

  const detailsSignature = useMemo(() => JSON.stringify(details), [details]);

  useEffect(() => {
    if (detailsSignature === detailsSavedRef.current) return;

    setDetailsSaveState("saving");
    const requestId = ++detailsRequestRef.current;
    const timer = setTimeout(async () => {
      const updated = await saveTask({
        title: details.title,
        description: details.description,
        status: details.status,
        priority: details.priority,
        dueDate: details.dueDate || null,
        assigneeId: details.assigneeId,
        companyId: details.companyId || null,
        projectId: details.projectId || null,
      });

      if (requestId !== detailsRequestRef.current) return;

      if (!updated) {
        setDetailsSaveState("error");
        return;
      }

      detailsSavedRef.current = detailsSignature;
      setTask(updated);
      setDetailsSaveState("saved");
    }, 700);

    return () => clearTimeout(timer);
  }, [details, detailsSignature, saveTask, task.id]);

  const runAi = async () => {
    if (!instruction.trim()) return;

    const userMessage = instruction.trim();
    setInstruction("");
    const nextChat = [...chat, { role: "user", text: userMessage }] satisfies Message[];
    setChat(nextChat);
    setWorking(true);

    try {
      const response = await fetch(`/api/tasks/${task.id}/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: userMessage, notes, messages: nextChat }),
      });

      const data = (await response.json()) as {
        assistantMessageMarkdown?: string;
        action?: "none" | "replace_notes";
        updatedNotes?: string;
        error?: string;
      };

      if (!response.ok) {
        setChat((prev) => [...prev, { role: "assistant", text: data.error || "AI request failed." }]);
        return;
      }

      if (data.action === "replace_notes" && typeof data.updatedNotes === "string") {
        setNotes(data.updatedNotes);
      }

      setChat((prev) => [...prev, { role: "assistant", text: data.assistantMessageMarkdown ?? "Done." }]);
    } finally {
      setWorking(false);
    }
  };

  const saveLabel = (() => {
    if (notesSaveState === "error" || detailsSaveState === "error") return "Auto-save failed";
    if (notesSaveState === "saving" || detailsSaveState === "saving") return "Auto-saving...";
    return "All changes saved";
  })();

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{details.title || task.title}</CardTitle>
              <CardDescription className="mt-1">{saveLabel}</CardDescription>
            </div>
            <Badge className={PRIORITY_COLORS[details.priority]}>{details.priority}</Badge>
          </div>
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <CardTitle>Task Details</CardTitle>
            <div className="flex items-center gap-2">
              <p className="text-xs text-zinc-500">Autosaves automatically</p>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-zinc-300" onClick={() => setDetailsOpen((state) => !state)}>
                {detailsOpen ? (
                  <>
                    Hide <ChevronUp className="ml-1 h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    Show <ChevronDown className="ml-1 h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>

          <p className="text-xs text-zinc-500">
            {TASK_STATUS_LABELS[details.status]} | {details.priority} | {users.find((user) => user.id === details.assigneeId)?.name ?? task.assignee.name}
            {details.dueDate ? ` | Due ${details.dueDate}` : " | No due date"}
          </p>

          {detailsOpen ? (
            <div className="grid gap-3 md:grid-cols-2">
            <Input
              value={details.title}
              onChange={(event) => setDetails((prev) => ({ ...prev, title: event.target.value }))}
              className="md:col-span-2"
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="none"
            />
            <Textarea
              value={details.description}
              onChange={(event) => setDetails((prev) => ({ ...prev, description: event.target.value }))}
              className="min-h-24 md:col-span-2"
              placeholder="Description"
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="none"
            />

            <Select
              value={details.status}
              onChange={(event) => setDetails((prev) => ({ ...prev, status: event.target.value as TaskStatus }))}
            >
              {(["TODO", "IN_PROGRESS", "BLOCKED", "DONE"] as const).map((status) => (
                <option key={status} value={status}>
                  {TASK_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>

            <Select
              value={details.priority}
              onChange={(event) => setDetails((prev) => ({ ...prev, priority: event.target.value as TaskPriority }))}
            >
              {(["LOW", "MEDIUM", "HIGH", "URGENT"] as const).map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </Select>

            <Input
              type="date"
              value={details.dueDate}
              onChange={(event) => setDetails((prev) => ({ ...prev, dueDate: event.target.value }))}
            />

            <Select
              value={details.assigneeId}
              onChange={(event) => setDetails((prev) => ({ ...prev, assigneeId: event.target.value }))}
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </Select>

            <Select
              value={details.companyId}
              onChange={(event) => setDetails((prev) => ({ ...prev, companyId: event.target.value }))}
            >
              <option value="">No Company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </Select>

            <Select
              value={details.projectId}
              onChange={(event) => setDetails((prev) => ({ ...prev, projectId: event.target.value }))}
            >
              <option value="">No Project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
            </div>
          ) : null}
        </Card>

        <Card className="space-y-3">
          <CardTitle>Notes</CardTitle>

          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-[460px] text-[15px] leading-7"
            placeholder="Write notes for this task..."
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="none"
          />
        </Card>
      </div>

      <aside className="space-y-5 xl:sticky xl:top-20 xl:self-start">
        <Card className="frost-pane-strong space-y-3 shadow-[0_0_44px_rgba(0,0,0,0.35)] xl:flex xl:h-[calc(100vh-7rem)] xl:flex-col">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-zinc-200" />
              <CardTitle>AI Chat</CardTitle>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="frost-pane-soft text-zinc-100 hover:bg-white/16"
              onClick={() => setChat([])}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              New chat
            </Button>
          </div>

          <div className="space-y-2 overflow-y-auto xl:flex-1">
            {chat.length ? (
              chat.map((message, index) => (
                <div key={`${message.role}-${index}`} className={message.role === "user" ? "text-right" : "text-left"}>
                  <div
                    className={
                      message.role === "user"
                        ? "frost-pane-strong ml-auto inline-block max-w-[95%] rounded-xl px-3 py-2 text-left text-xs text-zinc-100"
                        : "frost-pane inline-block max-w-[95%] rounded-xl px-3 py-2 text-left text-xs text-zinc-200"
                    }
                  >
                    <div className={message.role === "assistant" ? "prose prose-invert prose-p:my-1 prose-li:my-0 max-w-none text-xs" : "text-xs"}>
                      {renderNotesPreview(message.text)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-zinc-500">No messages yet. Ask anything about this task.</p>
            )}
          </div>

          <Textarea
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            className="min-h-24"
            placeholder="Ask a question about the task or ask me to edit the notes."
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="none"
          />

          <Button onClick={runAi} disabled={working} className="frost-pane-strong text-white hover:bg-white/20">
            {working ? "Thinking..." : "Send"}
          </Button>
        </Card>
      </aside>
    </div>
  );
}
