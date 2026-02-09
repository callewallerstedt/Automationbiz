import { NextResponse } from "next/server";
import { acceptDemoA, acceptDemoB, acceptDemoC, acceptDemoD } from "@/lib/demo-engine";
import { prisma } from "@/lib/prisma";

type AcceptPayload = {
  result: unknown;
  input?: {
    jobName?: string;
    estimatedMaterial?: string | number;
    actualMaterial?: string | number;
    estimatedHours?: string | number;
    actualHours?: string | number;
    materialCost?: string | number;
    laborRate?: string | number;
  };
};

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const payload = (await request.json()) as AcceptPayload;

  if (!payload.result) {
    return NextResponse.json({ error: "Missing result" }, { status: 400 });
  }

  if (slug === "email-or-pdf-to-order-draft") {
    await acceptDemoA(payload.result as Parameters<typeof acceptDemoA>[0]);
  } else if (slug === "invoice-to-inventory-update") {
    await acceptDemoB(payload.result as Parameters<typeof acceptDemoB>[0]);
  } else if (slug === "stock-warning-and-reorder") {
    await acceptDemoC(payload.result as Parameters<typeof acceptDemoC>[0]);
  } else if (slug === "job-cost-sanity-check") {
    await acceptDemoD(
      {
        jobName: payload.input?.jobName ?? "Unnamed Job",
        estimatedMaterial: Number(payload.input?.estimatedMaterial ?? 0),
        actualMaterial: Number(payload.input?.actualMaterial ?? 0),
        estimatedHours: Number(payload.input?.estimatedHours ?? 0),
        actualHours: Number(payload.input?.actualHours ?? 0),
        materialCost: Number(payload.input?.materialCost ?? 0),
        laborRate: Number(payload.input?.laborRate ?? 0),
      },
      payload.result as Parameters<typeof acceptDemoD>[1],
    );
  }

  const latestRun = await prisma.demoRun.findFirst({
    where: { demoSlug: slug, accepted: false },
    orderBy: { createdAt: "desc" },
  });

  if (latestRun) {
    await prisma.demoRun.update({
      where: { id: latestRun.id },
      data: { accepted: true },
    });
  }

  return NextResponse.json({ ok: true, message: "Record accepted and stored." });
}

