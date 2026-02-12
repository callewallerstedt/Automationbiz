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
  LOW: "bg-white/10 text-zinc-200",
  MEDIUM: "bg-white/14 text-zinc-100",
  HIGH: "bg-white/18 text-zinc-100",
  URGENT: "bg-white/24 text-white",
};

export const STAGE_COLORS: Record<PipelineStage, string> = {
  COMPANY_FOUND: "bg-white/10 text-zinc-200",
  DRAFT_RESEARCH: "bg-white/12 text-zinc-200",
  WAITING_REPLY: "bg-white/14 text-zinc-100",
  ON_HOOK: "bg-white/16 text-zinc-100",
  IN_PROGRESS: "bg-white/18 text-zinc-100",
  WON: "bg-white/20 text-white",
  LOST: "bg-white/22 text-white",
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
  IDEA: "bg-white/10 text-zinc-200",
  PROTOTYPE: "bg-white/16 text-zinc-100",
  READY: "bg-white/22 text-white",
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

