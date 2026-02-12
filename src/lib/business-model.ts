import { prisma } from "@/lib/prisma";

export const BUSINESS_MODEL_KEY = "default";

export type BusinessModelFields = {
  valueProposition: string;
  idealCustomer: string;
  offerings: string;
  pricingModel: string;
  salesProcess: string;
  constraints: string;
  toneGuidelines: string;
  aiSummary: string;
};

const BUSINESS_MODEL_FIELD_LABELS: Record<keyof BusinessModelFields, string> = {
  valueProposition: "Value Proposition",
  idealCustomer: "Ideal Customer",
  offerings: "Offerings",
  pricingModel: "Pricing Model",
  salesProcess: "Sales Process",
  constraints: "Constraints",
  toneGuidelines: "Tone Guidelines",
  aiSummary: "AI Summary",
};

export const DEFAULT_BUSINESS_MODEL_FIELDS: BusinessModelFields = {
  valueProposition: "",
  idealCustomer: "",
  offerings: "",
  pricingModel: "",
  salesProcess: "",
  constraints: "",
  toneGuidelines: "",
  aiSummary: "",
};

type BusinessModelRecord = {
  id: string;
  key: string;
  valueProposition: string;
  idealCustomer: string;
  offerings: string;
  pricingModel: string;
  salesProcess: string;
  constraints: string;
  toneGuidelines: string;
  aiSummary: string;
  updatedById: string | null;
  updatedBy: { id: string; name: string } | null;
  createdAt: Date;
  updatedAt: Date;
};

export function normalizeBusinessModelFields(value: Partial<BusinessModelFields>): BusinessModelFields {
  return {
    valueProposition: (value.valueProposition ?? "").trim(),
    idealCustomer: (value.idealCustomer ?? "").trim(),
    offerings: (value.offerings ?? "").trim(),
    pricingModel: (value.pricingModel ?? "").trim(),
    salesProcess: (value.salesProcess ?? "").trim(),
    constraints: (value.constraints ?? "").trim(),
    toneGuidelines: (value.toneGuidelines ?? "").trim(),
    aiSummary: (value.aiSummary ?? "").trim(),
  };
}

export async function getOrCreateBusinessModelProfile() {
  return prisma.businessModelProfile.upsert({
    where: { key: BUSINESS_MODEL_KEY },
    update: {},
    create: {
      key: BUSINESS_MODEL_KEY,
      ...DEFAULT_BUSINESS_MODEL_FIELDS,
    },
    include: {
      updatedBy: {
        select: { id: true, name: true },
      },
    },
  });
}

export async function updateBusinessModelProfile(
  input: Partial<BusinessModelFields>,
  options?: { updatedById?: string | null },
) {
  const current = await getOrCreateBusinessModelProfile();
  const next = normalizeBusinessModelFields({ ...current, ...input });

  const changed = (Object.keys(DEFAULT_BUSINESS_MODEL_FIELDS) as Array<keyof BusinessModelFields>).some(
    (field) => current[field] !== next[field],
  );

  if (!changed && options?.updatedById === undefined) {
    return current;
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.businessModelProfile.update({
      where: { id: current.id },
      data: {
        ...next,
        updatedById: options?.updatedById === undefined ? current.updatedById : options.updatedById,
      },
      include: {
        updatedBy: {
          select: { id: true, name: true },
        },
      },
    });

    if (changed) {
      await tx.businessModelRevision.create({
        data: {
          profileId: current.id,
          changedById: options?.updatedById ?? current.updatedById ?? null,
          snapshot: {
            valueProposition: current.valueProposition,
            idealCustomer: current.idealCustomer,
            offerings: current.offerings,
            pricingModel: current.pricingModel,
            salesProcess: current.salesProcess,
            constraints: current.constraints,
            toneGuidelines: current.toneGuidelines,
            aiSummary: current.aiSummary,
            updatedAt: current.updatedAt.toISOString(),
          },
        },
      });
    }

    return updated;
  });
}

function compact(value: string, maxLength = 1200) {
  const clean = value.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return "";
  return clean.length > maxLength ? `${clean.slice(0, maxLength - 3)}...` : clean;
}

function isRecordEmpty(profile: BusinessModelRecord) {
  return !(Object.keys(DEFAULT_BUSINESS_MODEL_FIELDS) as Array<keyof BusinessModelFields>).some(
    (field) => Boolean(profile[field].trim()),
  );
}

export function formatBusinessModelForPrompt(profile: BusinessModelRecord) {
  if (isRecordEmpty(profile)) {
    return "Business model profile is not configured yet.";
  }

  const lines: string[] = [];
  for (const field of Object.keys(DEFAULT_BUSINESS_MODEL_FIELDS) as Array<keyof BusinessModelFields>) {
    const value = compact(profile[field]);
    if (!value) continue;
    lines.push(`${BUSINESS_MODEL_FIELD_LABELS[field]}:\n${value}`);
  }

  return lines.join("\n\n");
}

export async function getBusinessModelPromptContext() {
  const profile = await getOrCreateBusinessModelProfile();
  return formatBusinessModelForPrompt(profile);
}
