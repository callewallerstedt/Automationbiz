import { NextResponse } from "next/server";
import { runDemoA, runDemoB, runDemoC, runDemoChatbot, runDemoD, runDemoE } from "@/lib/demo-engine";
import { prisma } from "@/lib/prisma";

type RunPayload = {
  rawText?: string;
  source?: "text" | "pdf" | "image";
  sourceDoc?: string;
  consumptionText?: string;
  jobName?: string;
  estimatedMaterial?: number;
  actualMaterial?: number;
  estimatedHours?: number;
  actualHours?: number;
  materialCost?: number;
  laborRate?: number;
  command?: string;
  systemPrompt?: string;
  message?: string;
  history?: Array<{ role: "user" | "assistant"; text: string }>;
};

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const payload = (await request.json()) as RunPayload;

  let output: unknown;

  if (slug === "email-or-pdf-to-order-draft") {
    output = await runDemoA({ rawText: payload.rawText ?? "", source: payload.source ?? "text" });
  } else if (slug === "chatbot") {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY is missing" }, { status: 400 });
    }

    output = await runDemoChatbot({
      systemPrompt: payload.systemPrompt ?? "",
      message: payload.message ?? "",
      history: payload.history ?? [],
    });
  } else if (slug === "invoice-to-inventory-update") {
    output = await runDemoB({ rawText: payload.rawText ?? "", sourceDoc: payload.sourceDoc ?? "upload" });
  } else if (slug === "stock-warning-and-reorder") {
    output = await runDemoC({ consumptionText: payload.consumptionText ?? "" });
  } else if (slug === "job-cost-sanity-check") {
    output = await runDemoD({
      jobName: payload.jobName ?? "Unnamed Job",
      estimatedMaterial: Number(payload.estimatedMaterial ?? 0),
      actualMaterial: Number(payload.actualMaterial ?? 0),
      estimatedHours: Number(payload.estimatedHours ?? 0),
      actualHours: Number(payload.actualHours ?? 0),
      materialCost: Number(payload.materialCost ?? 0),
      laborRate: Number(payload.laborRate ?? 0),
    });
  } else if (slug === "natural-language-actions") {
    output = await runDemoE(payload.command ?? "");
  } else {
    return NextResponse.json({ error: "Unknown demo slug" }, { status: 404 });
  }

  await prisma.demoRun.create({
    data: {
      demoSlug: slug,
      inputRaw: JSON.stringify(payload),
      outputJson: output as object,
      accepted: false,
    },
  });

  return NextResponse.json(output);
}

