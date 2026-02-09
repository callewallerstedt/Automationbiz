import { TaskPriority } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const payloadSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  notes: z.string().optional(),
  dueDate: z.string().nullable().optional(),
  priority: z.nativeEnum(TaskPriority),
  assigneeId: z.string().min(1),
  companyId: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  const payload = payloadSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const task = await prisma.task.create({
    data: {
      title: payload.data.title,
      description: payload.data.description ?? null,
      notes: payload.data.notes ?? null,
      dueDate: payload.data.dueDate ? new Date(payload.data.dueDate) : null,
      priority: payload.data.priority,
      assigneeId: payload.data.assigneeId,
      companyId: payload.data.companyId ?? null,
      projectId: payload.data.projectId ?? null,
    },
    include: {
      assignee: true,
      company: true,
      project: true,
    },
  });

  return NextResponse.json(task);
}

