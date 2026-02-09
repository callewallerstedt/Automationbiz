import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(_: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;

  const deleted = await prisma.demoPrompt.deleteMany({
    where: { id, demoSlug: slug },
  });

  if (!deleted.count) {
    return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
  }

  await prisma.demoPromptState.updateMany({
    where: {
      demoSlug: slug,
      selectedPromptId: id,
    },
    data: { selectedPromptId: null },
  });

  return NextResponse.json({ ok: true });
}
