import { PipelineStage } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const payloadSchema = z.object({
  stage: z.nativeEnum(PipelineStage),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = payloadSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
  }

  const company = await prisma.company.update({
    where: { id },
    data: { stage: payload.data.stage },
  });

  return NextResponse.json(company);
}

