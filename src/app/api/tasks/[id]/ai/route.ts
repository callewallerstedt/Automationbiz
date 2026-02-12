import { NextResponse } from "next/server";
import { z } from "zod";
import { getBusinessModelPromptContext } from "@/lib/business-model";
import { openAiModel, openai } from "@/lib/openai";
import { prisma } from "@/lib/prisma";

const payloadSchema = z.object({
  instruction: z.string().min(1),
  notes: z.string().default(""),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        text: z.string().min(1),
      }),
    )
    .optional(),
});

type ParsedAiOutput = {
  assistantMessageMarkdown?: string;
  action?: "none" | "replace_notes";
  updatedNotes?: string;
};

function hasEditIntent(instruction: string) {
  const text = instruction.trim();
  if (!text) return false;

  if (/^\/(apply|edit|rewrite|update|replace|insert|append|prepend|write)\b/i.test(text)) {
    return true;
  }

  const directEditVerb =
    /\b(edit|rewrite|reword|update|replace|change|fix|improve|shorten|expand|append|prepend|insert|remove|delete|clean up|polish|refactor|draft|write)\b/i;
  const targetHint =
    /\b(notes?|paragraph|section|line|bullet|intro|introduction|summary|todo|action items?|part|text|this)\b/i;

  return directEditVerb.test(text) && targetHint.test(text);
}

function parseJsonOutput(raw: string) {
  const trimmed = raw.trim();

  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed) as ParsedAiOutput;
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (!fenced) return null;

    try {
      return JSON.parse(fenced[1]) as ParsedAiOutput;
    } catch {
      return null;
    }
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY is missing" }, { status: 400 });
  }

  const { id } = await params;
  const payload = payloadSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const task = await prisma.task.findUnique({
    where: { id },
    include: { company: true, assignee: true, project: true },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const history = (payload.data.messages ?? [])
    .slice(-20)
    .map((message) => `${message.role === "assistant" ? "Assistant" : "User"}: ${message.text}`)
    .join("\n");
  const businessModelContext = await getBusinessModelPromptContext();

  const response = await openai.responses.create({
    model: openAiModel,
    temperature: 0.2,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text:
              "You are a precise task-note coworker. Behave as a normal chat assistant unless user asks to change the notes. When user asks to edit, rewrite, append, remove, or draft content, set action='replace_notes' and return full updatedNotes with only requested changes while preserving untouched content. Return only JSON with keys assistantMessageMarkdown, action, updatedNotes. action must be 'none' or 'replace_notes'.",
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Task context:
Title: ${task.title}
Description: ${task.description ?? ""}
Company: ${task.company?.name ?? ""}
Project: ${task.project?.name ?? ""}
Assignee: ${task.assignee.name}

Business model context:
${businessModelContext}

Current notes:
${payload.data.notes}

Previous chat:
${history || "(No previous messages)"}

Latest user message:
${payload.data.instruction}

Output rules:
- Respond in markdown for assistantMessageMarkdown.
- If user did not request note changes, set action to "none" and do not include updatedNotes.
- If user requested note changes (even if they did not say the word "notes"), set action to "replace_notes" and include full updatedNotes text.
- For targeted edits, keep all untouched note content exactly as-is.
- Return valid JSON only.`,
          },
        ],
      },
    ],
  });

  const outputText = response.output_text ?? "";
  const parsed = parseJsonOutput(outputText);

  if (!parsed) {
    return NextResponse.json({
      assistantMessageMarkdown: "I could not parse my last response. Please try again.",
      action: "none",
    });
  }

  const explicitApplyRequest = hasEditIntent(payload.data.instruction);
  const action =
    explicitApplyRequest && parsed.action === "replace_notes" && typeof parsed.updatedNotes === "string"
      ? "replace_notes"
      : "none";

  return NextResponse.json({
    assistantMessageMarkdown:
      typeof parsed.assistantMessageMarkdown === "string" && parsed.assistantMessageMarkdown.trim()
        ? parsed.assistantMessageMarkdown
        : "Done.",
    action,
    updatedNotes: action === "replace_notes" ? parsed.updatedNotes : undefined,
  });
}
