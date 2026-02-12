import { BusinessModelEditor } from "@/components/business-model/business-model-editor";
import { getOrCreateBusinessModelProfile } from "@/lib/business-model";

export const dynamic = "force-dynamic";

export default async function BusinessModelPage() {
  const profile = await getOrCreateBusinessModelProfile();

  return (
    <BusinessModelEditor
      initialProfile={{
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
        },
        updatedBy: profile.updatedBy,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      }}
    />
  );
}
