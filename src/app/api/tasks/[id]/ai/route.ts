import { NextResponse } from "next/server";
import { z } from "zod";
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
              "You are a precise task-note coworker. Edit notes exactly according to user instruction. Keep useful details. Behave as a normal chat assistant by default. Do not edit notes unless user explicitly asks to apply/update/rewrite notes, or uses a clear command like '/apply'. Return only JSON with keys assistantMessageMarkdown, action, updatedNotes. action must be 'none' or 'replace_notes'.",
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

Current notes:
${payload.data.notes}

Previous chat:
${history || "(No previous messages)"}

Latest user message:
${payload.data.instruction}

Output rules:
- Respond in markdown for assistantMessageMarkdown.
- If user did not explicitly request note update, set action to "none" and do not include updatedNotes.
- If user explicitly requested note update, set action to "replace_notes" and include full updatedNotes text.
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

  const explicitApplyRequest = /\b(apply|update|rewrite|edit|replace)\b[\s\S]{0,40}\b(note|notes)\b/i.test(
    payload.data.instruction,
  ) || /^\/apply\b/i.test(payload.data.instruction.trim());
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
