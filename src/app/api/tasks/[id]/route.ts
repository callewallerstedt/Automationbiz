import { TaskPriority, TaskStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  dueDate: z.string().nullable().optional(),
  assigneeId: z.string().min(1).optional(),
  companyId: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = updateSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const task = await prisma.task.update({
    where: { id },
    data: {
      title: payload.data.title,
      description: payload.data.description === "" ? null : payload.data.description,
      notes: payload.data.notes === "" ? null : payload.data.notes,
      status: payload.data.status,
      priority: payload.data.priority,
      assigneeId: payload.data.assigneeId,
      companyId: payload.data.companyId === "" ? null : payload.data.companyId,
      projectId: payload.data.projectId === "" ? null : payload.data.projectId,
      dueDate: payload.data.dueDate === undefined ? undefined : payload.data.dueDate ? new Date(payload.data.dueDate) : null,
    },
    include: {
      assignee: true,
      company: true,
      project: true,
    },
  });

  return NextResponse.json(task);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
