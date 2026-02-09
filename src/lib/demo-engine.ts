import { TaskPriority } from "@prisma/client";
import { addDays } from "date-fns";
import { openAiModel, openai } from "@/lib/openai";
import { prisma } from "@/lib/prisma";

type Confidence = "high" | "medium" | "low";

type OrderLine = {
  item: string;
  quantity: number;
  unit?: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

function getConfidence(found: boolean, medium = false): Confidence {
  if (found) {
    return medium ? "medium" : "high";
  }
  return "low";
}

function extractNumber(input: string) {
  const match = input.match(/(\d+(?:[\.,]\d+)?)/);
  if (!match) return null;
  return Number(match[1].replace(",", "."));
}

function parseLineItems(text: string): OrderLine[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const items: OrderLine[] = [];
  for (const line of lines) {
    const itemMatch = line.match(/^(?:-|\*|\d+[\.)])?\s*([A-Za-z\s]+?)\s*(\d+(?:[\.,]\d+)?)\s*([a-zA-Z]+)?$/);
    if (itemMatch) {
      items.push({
        item: itemMatch[1].trim(),
        quantity: Number(itemMatch[2].replace(",", ".")),
        unit: itemMatch[3]?.trim(),
      });
      continue;
    }

    const inlineMatch = line.match(/([A-Za-z\s]+?)\s*x\s*(\d+(?:[\.,]\d+)?)/i);
    if (inlineMatch) {
      items.push({
        item: inlineMatch[1].trim(),
        quantity: Number(inlineMatch[2].replace(",", ".")),
      });
    }
  }

  return items;
}

export async function runDemoA(input: { rawText: string; source: "text" | "pdf" | "image" }) {
  const text = input.rawText;
  const customer = text.match(/(?:customer|client|company)[:\-]\s*([^\n]+)/i)?.[1]?.trim() ?? null;
  const orderNumber =
    text.match(/(?:order\s*(?:no|number|#)|ordernr)[:\s#-]*([A-Z0-9-]+)/i)?.[1]?.trim() ?? null;
  const dateText = text.match(/(?:date|requested date|delivery date)[:\-]\s*([^\n]+)/i)?.[1]?.trim() ?? null;
  const totalText = text.match(/(?:total|amount|sum)[:\s$€]*([0-9\.,]+)/i)?.[1]?.trim() ?? null;

  const items = parseLineItems(text);

  return {
    customerName: customer,
    orderNumber,
    requestedDate: dateText,
    items,
    totalAmount: totalText ? Number(totalText.replace(",", ".")) : null,
    confidence: {
      customerName: getConfidence(Boolean(customer), true),
      orderNumber: getConfidence(Boolean(orderNumber)),
      requestedDate: getConfidence(Boolean(dateText), true),
      items: items.length > 0 ? "high" : "low",
      totalAmount: getConfidence(Boolean(totalText), true),
    },
    valueStatement: "Manual admin is reduced by turning unstructured orders into editable drafts.",
    source: input.source,
  };
}

export async function acceptDemoA(result: Awaited<ReturnType<typeof runDemoA>>) {
  return prisma.order.create({
    data: {
      sourceType: result.source,
      customerName: result.customerName,
      orderNumber: result.orderNumber,
      requestedDate: result.requestedDate ? new Date(result.requestedDate) : null,
      items: result.items,
      totalAmount: result.totalAmount,
      confidence: result.confidence,
      status: "ACCEPTED",
    },
  });
}

export async function runDemoB(input: { rawText: string; sourceDoc: string }) {
  const supplier = input.rawText.match(/(?:supplier|vendor|from)[:\-]\s*([^\n]+)/i)?.[1]?.trim() ?? "Unknown Supplier";
  const parsedLines = parseLineItems(input.rawText);
  const materials = await prisma.material.findMany();

  const updates = parsedLines.map((line) => {
    const matchedMaterial =
      materials.find((material) => material.name.toLowerCase().includes(line.item.toLowerCase())) ?? null;

    return {
      item: line.item,
      quantity: line.quantity,
      unit: line.unit ?? matchedMaterial?.unit ?? "units",
      matchedSku: matchedMaterial?.sku ?? null,
      existingStock: matchedMaterial?.stockQty ?? null,
      stockAfterApply: matchedMaterial ? matchedMaterial.stockQty + line.quantity : null,
      status: matchedMaterial ? "matched" : "unmatched",
    };
  });

  return {
    supplier,
    sourceDoc: input.sourceDoc,
    updates,
    confidence: {
      supplier: getConfidence(supplier !== "Unknown Supplier", true),
      items: updates.length > 0 ? "high" : "low",
    },
    valueStatement: "Stock records become reliable by staging supplier docs as structured updates.",
  };
}

export async function acceptDemoB(result: Awaited<ReturnType<typeof runDemoB>>) {
  const record = await prisma.inventoryUpdate.create({
    data: {
      sourceDoc: result.sourceDoc,
      supplier: result.supplier,
      items: result.updates,
      applied: true,
    },
  });

  await Promise.all(
    result.updates
      .filter((line) => line.matchedSku)
      .map((line) =>
        prisma.material.update({
          where: { sku: line.matchedSku ?? "" },
          data: { stockQty: { increment: line.quantity } },
        }),
      ),
  );

  return record;
}

export async function runDemoC(input: { consumptionText: string }) {
  const materials = await prisma.material.findMany({ orderBy: { name: "asc" } });

  const consumption = input.consumptionText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(":");
      const item = parts[0]?.trim() ?? "";
      const qty = parts[1] ? extractNumber(parts[1]) : null;
      return { item, quantity: qty ?? 0 };
    });

  const warnings = consumption
    .map((entry) => {
      const material = materials.find((value) => value.name.toLowerCase().includes(entry.item.toLowerCase()));
      if (!material) {
        return {
          item: entry.item,
          warning: "Material not found",
          severity: "high",
          reorderQty: null,
          eta: null,
        };
      }

      const after = material.stockQty - entry.quantity;
      const isLow = after <= material.minStock;
      const deficit = material.minStock - after;
      const reorderQty = isLow ? Math.max(material.reorderBatch, Math.ceil(deficit / material.reorderBatch) * material.reorderBatch) : 0;

      return {
        item: material.name,
        warning: isLow ? "Below minimum stock" : "No warning",
        severity: isLow ? (after < 0 ? "critical" : "medium") : "none",
        reorderQty: isLow ? reorderQty : null,
        eta: isLow ? addDays(new Date(), material.leadTimeDays).toISOString().slice(0, 10) : null,
        after,
        minStock: material.minStock,
        supplier: material.supplier,
        unit: material.unit,
      };
    })
    .filter((item) => item.warning !== "No warning");

  return {
    consumption,
    warnings,
    valueStatement: "Lead-time aware reorder suggestions prevent production delays.",
  };
}

export async function acceptDemoC(result: Awaited<ReturnType<typeof runDemoC>>) {
  const user = await prisma.user.findFirst({ where: { name: "Calle" } });
  if (!user) return null;

  const createdTasks = await Promise.all(
    result.warnings
      .filter((warning) => warning.reorderQty)
      .map((warning) =>
        prisma.task.create({
          data: {
            title: `Reorder ${warning.item}`,
            description: `Suggested reorder: ${warning.reorderQty} ${warning.unit} from ${warning.supplier}.`,
            dueDate: new Date(),
            priority: TaskPriority.URGENT,
            assigneeId: user.id,
            status: "TODO",
          },
        }),
      ),
  );

  return createdTasks;
}

export async function runDemoD(input: {
  jobName: string;
  estimatedMaterial: number;
  actualMaterial: number;
  estimatedHours: number;
  actualHours: number;
  materialCost: number;
  laborRate: number;
}) {
  const estimatedTotal = input.estimatedMaterial * input.materialCost + input.estimatedHours * input.laborRate;
  const actualTotal = input.actualMaterial * input.materialCost + input.actualHours * input.laborRate;

  const revenueAssumption = estimatedTotal * 1.35;
  const marginPct = ((revenueAssumption - actualTotal) / revenueAssumption) * 100;

  const abnormalUsage = input.actualMaterial > input.estimatedMaterial * 1.2 || input.actualHours > input.estimatedHours * 1.2;
  const marginWarning = marginPct < 15;

  return {
    estimatedTotal,
    actualTotal,
    marginPct: Number(marginPct.toFixed(1)),
    marginWarning,
    abnormalUsage,
    message: marginWarning ? "Margin risk detected. Investigate before next run." : "Margin looks healthy.",
    valueStatement: "Unprofitable jobs are spotted early through estimate-vs-actual checks.",
  };
}

export async function acceptDemoD(
  input: {
    jobName: string;
    estimatedMaterial: number;
    actualMaterial: number;
    estimatedHours: number;
    actualHours: number;
    materialCost: number;
    laborRate: number;
  },
  result: Awaited<ReturnType<typeof runDemoD>>,
) {
  return prisma.jobCostCheck.create({
    data: {
      jobName: input.jobName,
      estimatedMaterial: input.estimatedMaterial,
      actualMaterial: input.actualMaterial,
      estimatedHours: input.estimatedHours,
      actualHours: input.actualHours,
      materialCost: input.materialCost,
      laborRate: input.laborRate,
      marginPct: result.marginPct,
      abnormalUsage: result.abnormalUsage,
    },
  });
}

export async function runDemoE(command: string) {
  const normalized = command.trim().toLowerCase();

  const addMatch = normalized.match(/^add\s+(\d+(?:[\.,]\d+)?)\s*([a-z]*)\s+(.+)$/i);
  if (addMatch) {
    const quantity = Number(addMatch[1].replace(",", "."));
    const target = addMatch[3].trim();
    const material = await prisma.material.findFirst({
      where: { name: { contains: target } },
    });

    if (!material) {
      return {
        action: "add-stock",
        ok: false,
        message: `No material found for '${target}'.`,
      };
    }

    const updated = await prisma.material.update({
      where: { id: material.id },
      data: { stockQty: { increment: quantity } },
    });

    return {
      action: "add-stock",
      ok: true,
      message: `Added ${quantity} ${updated.unit} to ${updated.name}. New stock: ${updated.stockQty}.`,
      data: updated,
    };
  }

  if (normalized.includes("late orders")) {
    const lateOrders = await prisma.order.findMany({
      where: { status: "DRAFT", createdAt: { lt: addDays(new Date(), -2) } },
      orderBy: { createdAt: "asc" },
      take: 10,
    });

    return {
      action: "show-late-orders",
      ok: true,
      message: lateOrders.length ? `Found ${lateOrders.length} late draft orders.` : "No late draft orders found.",
      data: lateOrders,
    };
  }

  if (normalized.includes("overdue tasks") || normalized.includes("late tasks")) {
    const overdue = await prisma.task.findMany({
      where: {
        status: { not: "DONE" },
        dueDate: { lt: new Date() },
      },
      include: { assignee: true },
      orderBy: { dueDate: "asc" },
      take: 10,
    });

    return {
      action: "show-overdue-tasks",
      ok: true,
      message: overdue.length ? `Found ${overdue.length} overdue tasks.` : "No overdue tasks found.",
      data: overdue,
    };
  }

  return {
    action: "unsupported",
    ok: false,
    message: "Supported commands: add <quantity> <material>, show late orders, show overdue tasks.",
  };
}

export async function runDemoChatbot(input: {
  systemPrompt: string;
  message: string;
  history?: ChatMessage[];
}) {
  const systemPrompt = input.systemPrompt.trim() || "You are a helpful assistant.";
  const userMessage = input.message.trim();

  if (!userMessage) {
    return {
      assistantMessage: "Write a message first.",
      systemPrompt,
    };
  }

  const history = (input.history ?? [])
    .filter((entry) => (entry.role === "user" || entry.role === "assistant") && entry.text.trim())
    .slice(-20);

  const transcript = history
    .map((entry) => `${entry.role === "assistant" ? "Assistant" : "User"}: ${entry.text.trim()}`)
    .join("\n");

  const response = await openai.responses.create({
    model: openAiModel,
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: systemPrompt }],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: transcript ? `Conversation so far:\n${transcript}\n\nUser: ${userMessage}` : userMessage,
          },
        ],
      },
    ],
  });

  return {
    assistantMessage: response.output_text?.trim() || "I could not generate a response.",
    systemPrompt,
  };
}


