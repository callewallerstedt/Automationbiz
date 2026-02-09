import { DemoStatus, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.jobCostCheck.deleteMany();
  await prisma.inventoryUpdate.deleteMany();
  await prisma.material.deleteMany();
  await prisma.order.deleteMany();
  await prisma.demoRun.deleteMany();
  await prisma.demo.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.interaction.deleteMany();
  await prisma.companyLink.deleteMany();
  await prisma.company.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.createMany({
    data: [
      { name: "Calle", email: "calle@automationbiz.local" },
      { name: "Fredrik", email: "fredrik@automationbiz.local" },
    ],
  });

  await prisma.demo.createMany({
    data: [
      {
        slug: "chatbot",
        title: "Demo 1: Chatbot",
        description: "A normal chatbot with an editable custom system prompt that can be saved on the page.",
        status: DemoStatus.READY,
      },
      {
        slug: "email-or-pdf-to-order-draft",
        title: "Demo A: Email or PDF to Order Draft",
        description: "Extract structured order fields from email or PDF with confidence flags.",
        status: DemoStatus.READY,
      },
      {
        slug: "invoice-to-inventory-update",
        title: "Demo B: Invoice or Delivery Note to Inventory Update",
        description: "Parse supplier docs and stage inventory updates.",
        status: DemoStatus.PROTOTYPE,
      },
      {
        slug: "stock-warning-and-reorder",
        title: "Demo C: Stock Warning and Reorder Suggestions",
        description: "Forecast material consumption and suggest replenishment.",
        status: DemoStatus.READY,
      },
      {
        slug: "job-cost-sanity-check",
        title: "Demo D: Job Cost Sanity Check",
        description: "Compare estimate vs actual and flag margin risk.",
        status: DemoStatus.PROTOTYPE,
      },
      {
        slug: "natural-language-actions",
        title: "Demo E: Natural Language Actions",
        description: "Run safe operational commands using constrained natural language.",
        status: DemoStatus.IDEA,
      },
    ],
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
