import { PipelineStage } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  industry: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  painPoints: z.string().min(1).optional(),
  nextActionDate: z.string().nullable().optional(),
  stage: z.nativeEnum(PipelineStage).optional(),
  ownerId: z.string().min(1).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = updateSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const company = await prisma.company.update({
    where: { id },
    data: {
      name: payload.data.name,
      industry: payload.data.industry,
      location: payload.data.location,
      painPoints: payload.data.painPoints,
      stage: payload.data.stage,
      ownerId: payload.data.ownerId,
      nextActionDate:
        payload.data.nextActionDate === undefined
          ? undefined
          : payload.data.nextActionDate === null || payload.data.nextActionDate.trim() === ""
            ? null
            : new Date(payload.data.nextActionDate),
    },
    include: {
      owner: true,
      tasks: true,
      projects: true,
    },
  });

  return NextResponse.json(company);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await prisma.company.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
