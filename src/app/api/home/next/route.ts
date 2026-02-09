import { addDays, endOfDay } from "date-fns";
import { PipelineStage, TaskStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { openAiModel, openai } from "@/lib/openai";
import { prisma } from "@/lib/prisma";

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

type NextPayload = {
  headline: string;
  nextActions: NextAction[];
  workload: WorkloadItem[];
  risks: string[];
};

const BUSINESS_CONTEXT = `
You sell AI + automation discovery and implementation.
How you work:
1) You reach out to companies and propose an efficiency/productivity investigation.
2) You ask to shadow them for roughly one day.
3) You interview team members and observe workflows.
4) You deliver findings and offer implementation of the chosen improvements.
Your suggestions must support this exact flow.
`.trim();

function toDateLabel(value: Date | null) {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

function isIsoDay(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseJsonOutput(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed) as NextPayload;
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (!fenced) return null;

    try {
      return JSON.parse(fenced[1]) as NextPayload;
    } catch {
      return null;
    }
  }
}

function shortTitle(value: string) {
  const text = value.trim().replace(/\s+/g, " ");
  if (!text) return "";
  return text.length > 72 ? `${text.slice(0, 69)}...` : text;
}

function simplifyText(value: string) {
  return value
    .replace(/\bICP\b/gi, "ideal customer profile")
    .replace(/\bSOPs?\b/gi, "standard process")
    .replace(/\bKPI?s?\b/gi, "key metric")
    .replace(/\bRFI\b/gi, "request for information")
    .replace(/\bRFP\b/gi, "request for proposal")
    .replace(/\bPOC\b/gi, "proof of concept")
    .replace(/\bROI\b/gi, "return on investment")
    .replace(/\bNLP\b/gi, "language command")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeAction(input: unknown): NextAction | null {
  if (!input || typeof input !== "object") return null;
  const action = input as Partial<NextAction>;

  const title = typeof action.title === "string" ? shortTitle(action.title) : "";
  if (title.length < 2) return null;

  const why =
    typeof action.why === "string" && action.why.trim() ? simplifyText(action.why) : "High impact next step.";
  const owner = typeof action.owner === "string" && action.owner.trim() ? simplifyText(action.owner) : null;
  const dueDate = isIsoDay(action.dueDate) ? action.dueDate : null;
  const relatedType =
    action.relatedType === "task" || action.relatedType === "company" || action.relatedType === "project"
      ? action.relatedType
      : null;
  const relatedId = typeof action.relatedId === "string" && action.relatedId.trim() ? action.relatedId : null;

  return {
    title: simplifyText(title),
    why,
    owner,
    dueDate,
    relatedType,
    relatedId,
  };
}

function normalizePayload(input: unknown, fallback: NextPayload): NextPayload {
  if (!input || typeof input !== "object") return fallback;
  const value = input as Partial<NextPayload>;

  const headline =
    typeof value.headline === "string" && value.headline.trim() ? simplifyText(value.headline) : fallback.headline;

  const nextActions =
    Array.isArray(value.nextActions) && value.nextActions.length
      ? value.nextActions.map(normalizeAction).filter((item): item is NextAction => Boolean(item)).slice(0, 7)
      : fallback.nextActions;

  const workload =
    Array.isArray(value.workload) && value.workload.length
      ? value.workload
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const row = item as Partial<WorkloadItem>;
            if (typeof row.owner !== "string") return null;
            return {
              owner: row.owner,
              totalOpenTasks: Number(row.totalOpenTasks ?? 0),
              todo: Number(row.todo ?? 0),
              inProgress: Number(row.inProgress ?? 0),
              blocked: Number(row.blocked ?? 0),
              overdue: Number(row.overdue ?? 0),
            } satisfies WorkloadItem;
          })
          .filter((item): item is WorkloadItem => Boolean(item))
      : fallback.workload;

  const risks =
    Array.isArray(value.risks) && value.risks.length
      ? value.risks
          .map((risk) => (typeof risk === "string" ? simplifyText(risk) : ""))
          .filter(Boolean)
          .slice(0, 6)
      : fallback.risks;

  return {
    headline,
    nextActions: nextActions.length ? nextActions : fallback.nextActions,
    workload,
    risks,
  };
}

function buildFallback(input: {
  workload: WorkloadItem[];
  overdueTasks: Array<{ id: string; title: string; assignee: string | null; dueDate: string | null }>;
  blockedTasks: Array<{ id: string; title: string; assignee: string | null }>;
  followUps: Array<{ id: string; name: string; owner: string; nextActionDate: string | null }>;
}) {
  const nextActions: NextAction[] = [];
  const risks: string[] = [];
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = addDays(new Date(), 1).toISOString().slice(0, 10);

  for (const task of input.overdueTasks.slice(0, 3)) {
    nextActions.push({
      title: `Close overdue: ${task.title}`,
      why: "Fastest way to remove delivery risk.",
      owner: task.assignee,
      dueDate: task.dueDate,
      relatedType: "task",
      relatedId: task.id,
    });
  }

  for (const task of input.blockedTasks.slice(0, 2)) {
    nextActions.push({
      title: `Unblock: ${task.title}`,
      why: "Blocked work stops progress immediately.",
      owner: task.assignee,
      dueDate: today,
      relatedType: "task",
      relatedId: task.id,
    });
  }

  for (const company of input.followUps.slice(0, 2)) {
    nextActions.push({
      title: `Follow up ${company.name}`,
      why: "Due follow-ups keep opportunities alive.",
      owner: company.owner,
      dueDate: company.nextActionDate,
      relatedType: "company",
      relatedId: company.id,
    });
  }

  if (!nextActions.length) {
    nextActions.push(
      {
        title: "Research 20 target companies",
        why: "Build the first pipeline list.",
        owner: "Calle",
        dueDate: today,
        relatedType: null,
        relatedId: null,
      },
      {
        title: "Write shadow-day outreach draft",
        why: "Start conversations with a clear offer.",
        owner: "Fredrik",
        dueDate: today,
        relatedType: null,
        relatedId: null,
      },
      {
        title: "Prepare interview question set",
        why: "Guide discovery during company shadowing.",
        owner: "Calle",
        dueDate: tomorrow,
        relatedType: null,
        relatedId: null,
      },
      {
        title: "Pick demo to present first",
        why: "Show implementation path after investigation.",
        owner: "Fredrik",
        dueDate: tomorrow,
        relatedType: null,
        relatedId: null,
      },
    );
  }

  if (input.overdueTasks.length) risks.push(`${input.overdueTasks.length} overdue task(s) need action now.`);
  if (input.blockedTasks.length) risks.push(`${input.blockedTasks.length} blocked task(s) need decisions now.`);
  if (input.followUps.length) risks.push(`${input.followUps.length} follow-up(s) are due or overdue.`);

  return {
    headline: "Do these now: overdue tasks, blocked tasks, then follow-ups.",
    nextActions: nextActions.slice(0, 7),
    workload: input.workload,
    risks,
  } satisfies NextPayload;
}

export async function POST() {
  const [users, tasks, companies, projects] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: "asc" } }),
    prisma.task.findMany({
      include: { assignee: true, company: true, project: true },
      orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.company.findMany({
      include: {
        owner: true,
        interactions: { orderBy: { occurredAt: "desc" } },
        tasks: { include: { assignee: true }, orderBy: [{ status: "asc" }, { dueDate: "asc" }] },
        projects: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.project.findMany({
      include: { company: true, tasks: true },
      orderBy: { deadline: "asc" },
    }),
  ]);

  const assignableUsers: UserOption[] = users.map((user) => ({ id: user.id, name: user.name }));
  const now = new Date();

  const workload = users.map((user) => {
    const open = tasks.filter((task) => task.assigneeId === user.id && task.status !== TaskStatus.DONE);
    return {
      owner: user.name,
      totalOpenTasks: open.length,
      todo: open.filter((task) => task.status === TaskStatus.TODO).length,
      inProgress: open.filter((task) => task.status === TaskStatus.IN_PROGRESS).length,
      blocked: open.filter((task) => task.status === TaskStatus.BLOCKED).length,
      overdue: open.filter((task) => task.dueDate && task.dueDate < now).length,
    } satisfies WorkloadItem;
  });

  const overdueTasks = tasks
    .filter((task) => task.status !== TaskStatus.DONE && task.dueDate && task.dueDate < now)
    .map((task) => ({
      id: task.id,
      title: task.title,
      assignee: task.assignee?.name ?? null,
      dueDate: toDateLabel(task.dueDate),
    }));

  const blockedTasks = tasks
    .filter((task) => task.status === TaskStatus.BLOCKED)
    .map((task) => ({ id: task.id, title: task.title, assignee: task.assignee?.name ?? null }));

  const followUps = companies
    .filter(
      (company) =>
        company.stage !== PipelineStage.WON &&
        company.stage !== PipelineStage.LOST &&
        company.nextActionDate &&
        company.nextActionDate <= endOfDay(now),
    )
    .map((company) => ({
      id: company.id,
      name: company.name,
      owner: company.owner.name,
      nextActionDate: toDateLabel(company.nextActionDate),
    }));

  const fallback = buildFallback({
    workload,
    overdueTasks,
    blockedTasks,
    followUps,
  });

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      ...fallback,
      assignableUsers,
      generatedAt: new Date().toISOString(),
    });
  }

  const context = {
    generatedAt: new Date().toISOString(),
    businessModel: BUSINESS_CONTEXT,
    users: users.map((user) => ({ id: user.id, name: user.name, email: user.email })),
    tasks: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      notes: task.notes,
      status: task.status,
      priority: task.priority,
      dueDate: toDateLabel(task.dueDate),
      assignee: task.assignee ? { id: task.assignee.id, name: task.assignee.name } : null,
      company: task.company
        ? {
            id: task.company.id,
            name: task.company.name,
            stage: task.company.stage,
            industry: task.company.industry,
            painPoints: task.company.painPoints,
          }
        : null,
      project: task.project ? { id: task.project.id, name: task.project.name, status: task.project.status } : null,
      updatedAt: task.updatedAt.toISOString(),
    })),
    companies: companies.map((company) => ({
      id: company.id,
      name: company.name,
      stage: company.stage,
      industry: company.industry,
      location: company.location,
      painPoints: company.painPoints,
      website: company.website,
      nextActionDate: toDateLabel(company.nextActionDate),
      owner: { id: company.owner.id, name: company.owner.name },
      interactions: company.interactions.map((interaction) => ({
        id: interaction.id,
        type: interaction.type,
        summary: interaction.summary,
        occurredAt: interaction.occurredAt.toISOString(),
      })),
      tasks: company.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        dueDate: toDateLabel(task.dueDate),
        assignee: task.assignee.name,
      })),
      projects: company.projects.map((project) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        deadline: project.deadline.toISOString().slice(0, 10),
      })),
    })),
    projects: projects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      deadline: project.deadline.toISOString().slice(0, 10),
      company: { id: project.company.id, name: project.company.name },
      tasks: project.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        dueDate: toDateLabel(task.dueDate),
      })),
    })),
    workload,
  };

  try {
    const response = await openai.responses.create({
      model: openAiModel,
      temperature: 0.1,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "You are an execution-focused operations assistant. Output JSON only with keys: headline, nextActions, workload, risks. Keep the wording simple and concrete. Do not use abbreviations or jargon. nextActions must be direct actions to do now. For each action: title must be imperative and <= 7 words, why must be one short sentence. Prefer action verbs like Research, Draft, Prepare, Follow up, Unblock, Book. Use relatedType one of task|company|project|null.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Business context:\n${BUSINESS_CONTEXT}\n\nWorkspace context:\n${JSON.stringify(context)}\n\nPrioritization rules:\n1) Overdue tasks first\n2) Blocked tasks second\n3) Follow-ups due/overdue third\n4) Then discovery pipeline growth (research companies, outreach drafts, shadow-day prep, demo prep)\n\nReturn valid JSON only.`,
            },
          ],
        },
      ],
    });

    const parsedRaw = parseJsonOutput(response.output_text ?? "");
    const parsed = normalizePayload(parsedRaw, fallback);

    return NextResponse.json({
      ...parsed,
      assignableUsers,
      generatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({
      ...fallback,
      assignableUsers,
      generatedAt: new Date().toISOString(),
    });
  }
}
