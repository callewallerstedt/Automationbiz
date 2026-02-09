import { endOfDay } from "date-fns";
import { DemoStatus, PipelineStage, ProjectStatus, TaskStatus } from "@prisma/client";
import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/prisma";
import { PIPELINE_STAGES } from "@/lib/constants";

const DEFAULT_DEMOS = [
  {
    slug: "chatbot",
    title: "Demo 1: Chatbot",
    description: "A normal chatbot with an editable custom system prompt that can be saved on the page.",
    status: DemoStatus.READY,
  },
  {
    slug: "email-or-pdf-to-order-draft",
    title: "Demo A: Email or PDF to Order Draft",
    description: "Extract structured order fields from email or PDF with confidence flags.",
    status: DemoStatus.READY,
  },
  {
    slug: "invoice-to-inventory-update",
    title: "Demo B: Invoice or Delivery Note to Inventory Update",
    description: "Parse supplier docs and stage inventory updates.",
    status: DemoStatus.PROTOTYPE,
  },
  {
    slug: "stock-warning-and-reorder",
    title: "Demo C: Stock Warning and Reorder Suggestions",
    description: "Forecast material consumption and suggest replenishment.",
    status: DemoStatus.READY,
  },
  {
    slug: "job-cost-sanity-check",
    title: "Demo D: Job Cost Sanity Check",
    description: "Compare estimate vs actual and flag margin risk.",
    status: DemoStatus.PROTOTYPE,
  },
  {
    slug: "natural-language-actions",
    title: "Demo E: Natural Language Actions",
    description: "Run safe operational commands using constrained natural language.",
    status: DemoStatus.IDEA,
  },
] as const;

async function ensureDefaultDemos() {
  const existing = await prisma.demo.findMany({ select: { slug: true } });
  const existingSlugs = new Set(existing.map((item) => item.slug));
  const missing = DEFAULT_DEMOS.filter((demo) => !existingSlugs.has(demo.slug));

  if (!missing.length) return;

  await Promise.all(
    missing.map((demo) =>
      prisma.demo.upsert({
        where: { slug: demo.slug },
        update: {},
        create: demo,
      }),
    ),
  );
}

export async function getUsers() {
  noStore();
  return prisma.user.findMany({ orderBy: { name: "asc" } });
}

export async function getHomeData() {
  noStore();
  const [users, todoTasks, openTasks, followUps, projects, companies, companyList] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: "asc" } }),
    prisma.task.findMany({
      where: { status: TaskStatus.TODO },
      include: { assignee: true, company: true },
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
    }),
    prisma.task.findMany({
      where: { status: { not: TaskStatus.DONE } },
      include: { assignee: true, company: true },
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
    }),
    prisma.company.findMany({
      where: {
        stage: { notIn: [PipelineStage.WON, PipelineStage.LOST] },
        nextActionDate: { lte: endOfDay(new Date()) },
      },
      include: { owner: true },
      orderBy: { nextActionDate: "asc" },
    }),
    prisma.project.findMany({
      where: { status: { in: [ProjectStatus.ACTIVE, ProjectStatus.ON_HOLD] } },
      include: { company: true },
      orderBy: { deadline: "asc" },
      take: 8,
    }),
    prisma.company.findMany({ select: { stage: true } }),
    prisma.company.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const pipelineSummary = PIPELINE_STAGES.map((stage) => ({
    stage,
    count: companies.filter((company) => company.stage === stage).length,
  }));

  const tasksByOwner = users.map((user) => ({
    user,
    tasks: todoTasks.filter((task) => task.assigneeId === user.id),
  }));

  const overdueTodoCount = todoTasks.filter((task) => task.dueDate && task.dueDate < new Date()).length;
  const totalTodoCount = todoTasks.length;
  const me = users.find((user) => user.name.toLowerCase() === "calle") ?? users[0] ?? null;

  return {
    todoByOwner: tasksByOwner,
    openTasks,
    assignableUsers: users.map((user) => ({ id: user.id, name: user.name })),
    companyList,
    me,
    overdueTodoCount,
    totalTodoCount,
    followUps,
    pipelineSummary,
    activeProjects: projects,
  };
}

export async function getPipelineData(filters?: {
  industry?: string;
  ownerId?: string;
  location?: string;
}) {
  noStore();
  const where = {
    industry: filters?.industry && filters.industry !== "all" ? filters.industry : undefined,
    ownerId: filters?.ownerId && filters.ownerId !== "all" ? filters.ownerId : undefined,
    location: filters?.location && filters.location !== "all" ? filters.location : undefined,
  };

  const [companies, users, industries, locations] = await Promise.all([
    prisma.company.findMany({
      where,
      include: {
        owner: true,
        tasks: { where: { status: { not: TaskStatus.DONE } } },
        projects: { where: { status: { not: ProjectStatus.COMPLETE } } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
    prisma.company.findMany({ distinct: ["industry"], select: { industry: true }, orderBy: { industry: "asc" } }),
    prisma.company.findMany({ distinct: ["location"], select: { location: true }, orderBy: { location: "asc" } }),
  ]);

  return {
    companies,
    users,
    industries: industries.map((item) => item.industry),
    locations: locations.map((item) => item.location),
  };
}

export async function getCompanyById(id: string) {
  noStore();
  return prisma.company.findUnique({
    where: { id },
    include: {
      owner: true,
      interactions: {
        include: { createdBy: true },
        orderBy: { occurredAt: "desc" },
      },
      tasks: {
        include: { assignee: true, project: true },
        orderBy: { dueDate: "asc" },
      },
      projects: {
        include: {
          tasks: true,
        },
        orderBy: { deadline: "asc" },
      },
      links: true,
    },
  });
}

export async function getTaskData() {
  noStore();
  const [tasks, users, companies, projects] = await Promise.all([
    prisma.task.findMany({
      include: { assignee: true, company: true, project: true },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
    prisma.company.findMany({ orderBy: { name: "asc" } }),
    prisma.project.findMany({ orderBy: { name: "asc" } }),
  ]);

  return { tasks, users, companies, projects };
}

export async function getTaskWorkspaceData(taskId: string) {
  noStore();
  const [task, users, companies, projects] = await Promise.all([
    prisma.task.findUnique({
      where: { id: taskId },
      include: { assignee: true, company: true, project: true },
    }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
    prisma.company.findMany({ orderBy: { name: "asc" } }),
    prisma.project.findMany({ orderBy: { name: "asc" } }),
  ]);

  return { task, users, companies, projects };
}

export async function getDemoList() {
  noStore();
  await ensureDefaultDemos();
  return prisma.demo.findMany({ orderBy: { title: "asc" } });
}

export async function getDemoBySlug(slug: string) {
  noStore();
  await ensureDefaultDemos();
  const [demo, recentRuns, materials] = await Promise.all([
    prisma.demo.findUnique({ where: { slug } }),
    prisma.demoRun.findMany({ where: { demoSlug: slug }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.material.findMany({ orderBy: { name: "asc" } }),
  ]);

  return { demo, recentRuns, materials };
}

export async function searchEverything(query: string) {
  noStore();
  if (!query.trim()) {
    return { companies: [], tasks: [], projects: [] };
  }

  const normalized = query.trim();

  const [companies, tasks, projects] = await Promise.all([
    prisma.company.findMany({
      where: {
        OR: [
          { name: { contains: normalized } },
          { industry: { contains: normalized } },
          { location: { contains: normalized } },
        ],
      },
      take: 6,
    }),
    prisma.task.findMany({
      where: { title: { contains: normalized } },
      include: { assignee: true },
      take: 6,
    }),
    prisma.project.findMany({
      where: { name: { contains: normalized } },
      include: { company: true },
      take: 6,
    }),
  ]);

  return { companies, tasks, projects };
}

