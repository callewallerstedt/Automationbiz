import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const DEFAULT_SYSTEM_PROMPT = "You are a helpful assistant.";

const namedPromptSchema = z.object({
  name: z.string().min(1),
  text: z.string().min(1),
  select: z.boolean().optional(),
});

const promptStateSchema = z.object({
  systemPrompt: z.string().optional(),
  selectedPromptId: z.string().nullable().optional(),
});

function normalizePromptName(name: string) {
  return name.replace(/\s+/g, " ").trim();
}

async function loadPromptPayload(slug: string) {
  const [prompts, state] = await Promise.all([
    prisma.demoPrompt.findMany({
      where: { demoSlug: slug },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    }),
    prisma.demoPromptState.findUnique({ where: { demoSlug: slug } }),
  ]);

  const promptIds = new Set(prompts.map((prompt) => prompt.id));
  const selectedPromptId = state?.selectedPromptId && promptIds.has(state.selectedPromptId) ? state.selectedPromptId : "";

  return {
    systemPrompt: state?.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
    selectedPromptId,
    prompts: prompts.map((prompt) => ({
      id: prompt.id,
      name: prompt.name,
      text: prompt.text,
    })),
  };
}

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return NextResponse.json(await loadPromptPayload(slug));
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const payload = namedPromptSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const name = normalizePromptName(payload.data.name);
  const text = payload.data.text.trim();
  if (!name || !text) {
    return NextResponse.json({ error: "Prompt name and text are required" }, { status: 400 });
  }

  const savedPrompt = await prisma.demoPrompt.upsert({
    where: { demoSlug_name: { demoSlug: slug, name } },
    update: { text },
    create: { demoSlug: slug, name, text },
  });

  if (payload.data.select) {
    await prisma.demoPromptState.upsert({
      where: { demoSlug: slug },
      update: {
        selectedPromptId: savedPrompt.id,
        systemPrompt: savedPrompt.text,
      },
      create: {
        demoSlug: slug,
        systemPrompt: savedPrompt.text,
        selectedPromptId: savedPrompt.id,
      },
    });
  }

  return NextResponse.json(await loadPromptPayload(slug));
}

export async function PUT(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const payload = promptStateSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const hasSystemPrompt = payload.data.systemPrompt !== undefined;
  const hasSelectedPromptId = payload.data.selectedPromptId !== undefined;
  if (!hasSystemPrompt && !hasSelectedPromptId) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  let normalizedSelectedPromptId: string | null | undefined = undefined;
  if (hasSelectedPromptId) {
    const raw = payload.data.selectedPromptId;
    normalizedSelectedPromptId = raw ? raw.trim() || null : null;

    if (normalizedSelectedPromptId) {
      const promptExists = await prisma.demoPrompt.findFirst({
        where: { id: normalizedSelectedPromptId, demoSlug: slug },
        select: { id: true },
      });

      if (!promptExists) {
        return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
      }
    }
  }

  const existingState = await prisma.demoPromptState.findUnique({ where: { demoSlug: slug } });
  const nextSystemPrompt =
    payload.data.systemPrompt?.trim() ||
    existingState?.systemPrompt ||
    DEFAULT_SYSTEM_PROMPT;

  await prisma.demoPromptState.upsert({
    where: { demoSlug: slug },
    update: {
      systemPrompt: hasSystemPrompt ? nextSystemPrompt : undefined,
      selectedPromptId: hasSelectedPromptId ? normalizedSelectedPromptId ?? null : undefined,
    },
    create: {
      demoSlug: slug,
      systemPrompt: nextSystemPrompt,
      selectedPromptId: normalizedSelectedPromptId ?? null,
    },
  });

  return NextResponse.json(await loadPromptPayload(slug));
}
