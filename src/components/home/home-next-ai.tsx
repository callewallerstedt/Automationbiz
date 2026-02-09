"use client";

import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";

type NextAction = {
  title: string;
  why: string;
  owner: string | null;
  dueDate: string | null;
  relatedType: "task" | "company" | "project" | null;
  relatedId: string | null;
};

type WorkloadItem = {
  owner: string;
  totalOpenTasks: number;
  todo: number;
  inProgress: number;
  blocked: number;
  overdue: number;
};

type UserOption = {
  id: string;
  name: string;
};

type NextResponsePayload = {
  headline: string;
  nextActions: NextAction[];
  workload: WorkloadItem[];
  risks: string[];
  assignableUsers: UserOption[];
  generatedAt: string;
};

export function HomeNextAi() {
  const [busy, setBusy] = useState(false);
  const [assigningKey, setAssigningKey] = useState<string | null>(null);
  const [assignMessage, setAssignMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<NextResponsePayload | null>(null);
  const [assigneeByActionKey, setAssigneeByActionKey] = useState<Record<string, string>>({});

  const generatedLabel = useMemo(() => {
    if (!result?.generatedAt) return null;
    return new Date(result.generatedAt).toLocaleString();
  }, [result?.generatedAt]);

  const actionKey = (action: NextAction, index: number) => `${index}-${action.title}-${action.relatedType ?? "none"}-${action.relatedId ?? "none"}`;

  const pickDefaultAssignee = (payload: NextResponsePayload, ownerName: string | null) => {
    if (!payload.assignableUsers.length) return "";
    if (!ownerName) return payload.assignableUsers[0].id;

    const matched = payload.assignableUsers.find((user) => user.name.toLowerCase() === ownerName.toLowerCase());
    return matched?.id ?? payload.assignableUsers[0].id;
  };

  const onWhatNext = async () => {
    setBusy(true);
    setError(null);
    setAssignMessage(null);

    try {
      const response = await fetch("/api/home/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = (await response.json()) as NextResponsePayload & { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Could not generate next actions.");
        return;
      }

      setResult(data);
      const nextMap: Record<string, string> = {};
      data.nextActions.forEach((action, index) => {
        nextMap[actionKey(action, index)] = pickDefaultAssignee(data, action.owner);
      });
      setAssigneeByActionKey(nextMap);
    } catch {
      setError("Could not generate next actions.");
    } finally {
      setBusy(false);
    }
  };

  const assignActionAsTask = async (action: NextAction, index: number) => {
    if (!result) return;
    const key = actionKey(action, index);
    const assigneeId = assigneeByActionKey[key] ?? result.assignableUsers[0]?.id ?? "";
    if (!assigneeId) {
      setAssignMessage("No assignee available.");
      return;
    }

    setAssigningKey(key);
    setAssignMessage(null);

    try {
      const payload = {
        title: action.title,
        description: action.why,
        notes: "",
        dueDate: action.dueDate ?? null,
        priority: "MEDIUM",
        assigneeId,
        companyId: action.relatedType === "company" ? action.relatedId : null,
        projectId: action.relatedType === "project" ? action.relatedId : null,
      };

      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setAssignMessage("Could not assign task.");
        return;
      }

      setAssignMessage(`Assigned: ${action.title}`);
    } catch {
      setAssignMessage("Could not assign task.");
    } finally {
      setAssigningKey(null);
    }
  };

  return (
    <Card className="min-w-0 space-y-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <CardTitle>AI Next Step</CardTitle>
        <Sparkles className="h-4 w-4 text-sky-300" />
      </div>

      <Button onClick={onWhatNext} disabled={busy} className="w-full">
        {busy ? "Thinking..." : "What next?"}
      </Button>

      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
      {assignMessage ? <p className="text-xs text-emerald-300">{assignMessage}</p> : null}

      {result ? (
        <div className="max-h-[30rem] space-y-3 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
          <p className="break-words text-sm font-medium text-zinc-100">{result.headline}</p>

          <div className="space-y-2">
            {result.nextActions.length ? (
              result.nextActions.map((action, index) => (
                <div key={`${action.title}-${index}`} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2">
                  <p className="break-words text-sm font-semibold text-zinc-100">{action.title}</p>
                  <p className="break-words text-xs text-zinc-400">{action.why}</p>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    {action.owner ? `Owner: ${action.owner}` : "Owner: Unassigned"}
                    {action.dueDate ? ` | Due: ${action.dueDate}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Select
                      className="h-8 min-w-[9rem] flex-1"
                      value={assigneeByActionKey[actionKey(action, index)] ?? ""}
                      onChange={(event) =>
                        setAssigneeByActionKey((prev) => ({
                          ...prev,
                          [actionKey(action, index)]: event.target.value,
                        }))
                      }
                    >
                      {result.assignableUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </Select>
                    <Button
                      size="sm"
                      onClick={() => assignActionAsTask(action, index)}
                      disabled={assigningKey === actionKey(action, index) || !result.assignableUsers.length}
                    >
                      {assigningKey === actionKey(action, index) ? "Assigning..." : "Assign task"}
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-zinc-500">No action suggestions yet.</p>
            )}
          </div>

          {result.risks.length ? (
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-zinc-500">Watch Outs</p>
              <div className="space-y-1">
                {result.risks.map((risk, index) => (
                  <p key={`${risk}-${index}`} className="text-xs text-amber-200">
                    - {risk}
                  </p>
                ))}
              </div>
            </div>
          ) : null}

          {result.workload.length ? (
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-zinc-500">Team Load</p>
              <div className="space-y-1">
                {result.workload.map((item) => (
                  <p key={item.owner} className="text-xs text-zinc-400">
                    {item.owner}: {item.totalOpenTasks} open ({item.todo} todo, {item.inProgress} in progress, {item.blocked} blocked, {item.overdue} overdue)
                  </p>
                ))}
              </div>
            </div>
          ) : null}

          {generatedLabel ? <p className="text-[11px] text-zinc-500">Updated: {generatedLabel}</p> : null}
        </div>
      ) : null}
    </Card>
  );
}
