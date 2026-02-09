import { DemoStatus, PipelineStage, TaskPriority, TaskStatus } from "@prisma/client";

export const PIPELINE_STAGES: PipelineStage[] = [
  "COMPANY_FOUND",
  "DRAFT_RESEARCH",
  "WAITING_REPLY",
  "ON_HOOK",
  "IN_PROGRESS",
  "WON",
  "LOST",
];

export const TASK_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"];

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: "bg-emerald-500/15 text-emerald-300",
  MEDIUM: "bg-sky-500/15 text-sky-300",
  HIGH: "bg-amber-500/15 text-amber-300",
  URGENT: "bg-rose-500/15 text-rose-300",
};

export const STAGE_COLORS: Record<PipelineStage, string> = {
  COMPANY_FOUND: "bg-zinc-500/20 text-zinc-200",
  DRAFT_RESEARCH: "bg-indigo-500/20 text-indigo-200",
  WAITING_REPLY: "bg-sky-500/20 text-sky-200",
  ON_HOOK: "bg-violet-500/20 text-violet-200",
  IN_PROGRESS: "bg-amber-500/20 text-amber-200",
  WON: "bg-emerald-500/20 text-emerald-200",
  LOST: "bg-rose-500/20 text-rose-200",
};

export const STAGE_LABELS: Record<PipelineStage, string> = {
  COMPANY_FOUND: "Potential Prey",
  DRAFT_RESEARCH: "Draft + Research",
  WAITING_REPLY: "Waiting for Reply",
  ON_HOOK: "On the Hook",
  IN_PROGRESS: "In Progress",
  WON: "Won",
  LOST: "Lost",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "To-do",
  IN_PROGRESS: "In Progress",
  BLOCKED: "Blocked",
  DONE: "Done",
};

export const DEMO_STATUS_COLORS: Record<DemoStatus, string> = {
  IDEA: "bg-zinc-500/20 text-zinc-200",
  PROTOTYPE: "bg-amber-500/20 text-amber-200",
  READY: "bg-emerald-500/20 text-emerald-200",
};

export const DEMO_SLUG_ORDER = [
  "chatbot",
  "email-or-pdf-to-order-draft",
  "invoice-to-inventory-update",
  "stock-warning-and-reorder",
  "job-cost-sanity-check",
  "natural-language-actions",
] as const;

export const OWNER_OPTIONS = ["Calle", "Fredrik"] as const;

