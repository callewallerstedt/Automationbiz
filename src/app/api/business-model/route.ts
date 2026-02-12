import { NextResponse } from "next/server";
import { z } from "zod";
import {
  DEFAULT_BUSINESS_MODEL_FIELDS,
  getOrCreateBusinessModelProfile,
  updateBusinessModelProfile,
  type BusinessModelFields,
} from "@/lib/business-model";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  valueProposition: z.string().max(12000).optional(),
  idealCustomer: z.string().max(12000).optional(),
  offerings: z.string().max(12000).optional(),
  pricingModel: z.string().max(12000).optional(),
  salesProcess: z.string().max(12000).optional(),
  constraints: z.string().max(12000).optional(),
  toneGuidelines: z.string().max(12000).optional(),
  aiSummary: z.string().max(12000).optional(),
});

function serialize(profile: Awaited<ReturnType<typeof getOrCreateBusinessModelProfile>>) {
  return {
    id: profile.id,
    key: profile.key,
    fields: {
      valueProposition: profile.valueProposition,
      idealCustomer: profile.idealCustomer,
      offerings: profile.offerings,
      pricingModel: profile.pricingModel,
      salesProcess: profile.salesProcess,
      constraints: profile.constraints,
      toneGuidelines: profile.toneGuidelines,
      aiSummary: profile.aiSummary,
    } satisfies BusinessModelFields,
    updatedBy: profile.updatedBy,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

export async function GET() {
  const profile = await getOrCreateBusinessModelProfile();
  return NextResponse.json(serialize(profile));
}

export async function PATCH(request: Request) {
  const payload = updateSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const touchedFields = (Object.keys(DEFAULT_BUSINESS_MODEL_FIELDS) as Array<keyof BusinessModelFields>).filter(
    (field) => payload.data[field] !== undefined,
  );

  if (!touchedFields.length) {
    const profile = await getOrCreateBusinessModelProfile();
    return NextResponse.json(serialize(profile));
  }

  const firstUser = await prisma.user.findFirst({
    orderBy: { name: "asc" },
    select: { id: true },
  });

  const profile = await updateBusinessModelProfile(payload.data, {
    updatedById: firstUser?.id ?? null,
  });

  return NextResponse.json(serialize(profile));
}
