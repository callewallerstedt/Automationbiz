"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Clock3, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { BusinessModelFields } from "@/lib/business-model";

type SaveState = "saved" | "saving" | "error";

type BusinessModelProfileView = {
  id: string;
  key: string;
  fields: BusinessModelFields;
  updatedBy: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
};

const SECTION_CONFIG: Array<{
  field: keyof BusinessModelFields;
  title: string;
  description: string;
  placeholder: string;
  className?: string;
}> = [
  {
    field: "valueProposition",
    title: "Value Proposition",
    description: "What problem you solve and why clients should buy from you.",
    placeholder: "Describe your core promise, outcomes, and differentiation.",
  },
  {
    field: "idealCustomer",
    title: "Ideal Customer",
    description: "Which companies and decision makers you target first.",
    placeholder: "Industry, size, geography, triggers, and key personas.",
  },
  {
    field: "offerings",
    title: "Offerings",
    description: "What you sell in concrete packages.",
    placeholder: "Discovery package, implementation package, support package, etc.",
  },
  {
    field: "pricingModel",
    title: "Pricing Model",
    description: "How you charge and what influences price.",
    placeholder: "Fixed fee, tiered pricing, retainers, outcome-based pricing.",
  },
  {
    field: "salesProcess",
    title: "Sales Process",
    description: "How leads move from first outreach to closed deal.",
    placeholder: "Outreach, shadow day, findings, proposal, close, handover.",
  },
  {
    field: "constraints",
    title: "Constraints",
    description: "Guardrails the AI must respect.",
    placeholder: "Legal, technical, pricing floor, delivery capacity, excluded industries.",
  },
  {
    field: "toneGuidelines",
    title: "Tone Guidelines",
    description: "How the AI should communicate on your behalf.",
    placeholder: "Direct, practical, plain language, no hype, etc.",
  },
  {
    field: "aiSummary",
    title: "AI Summary",
    description: "Short version injected into prompts by default.",
    placeholder: "Compact summary for AI context. Keep this tight and high signal.",
    className: "min-h-36",
  },
];

export function BusinessModelEditor({ initialProfile }: { initialProfile: BusinessModelProfileView }) {
  const [profile, setProfile] = useState(initialProfile);
  const [fields, setFields] = useState(initialProfile.fields);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [errorText, setErrorText] = useState<string | null>(null);
  const savedRef = useRef(JSON.stringify(initialProfile.fields));
  const requestRef = useRef(0);

  const signature = useMemo(() => JSON.stringify(fields), [fields]);

  const onFieldChange = (field: keyof BusinessModelFields, value: string) => {
    setErrorText(null);
    setSaveState("saving");
    setFields((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (signature === savedRef.current) return;

    const requestId = ++requestRef.current;

    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/business-model", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fields),
        });

        if (requestId !== requestRef.current) return;

        if (!response.ok) {
          setSaveState("error");
          setErrorText("Could not save business model.");
          return;
        }

        const updated = (await response.json()) as BusinessModelProfileView;
        savedRef.current = JSON.stringify(updated.fields);
        setProfile(updated);
        setFields(updated.fields);
        setSaveState("saved");
      } catch {
        if (requestId !== requestRef.current) return;
        setSaveState("error");
        setErrorText("Could not save business model.");
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [fields, signature]);

  const saveLabel = (() => {
    if (saveState === "saving") return "Auto-saving...";
    if (saveState === "error") return errorText ?? "Auto-save failed";
    return "All changes saved";
  })();

  const updatedAtLabel = new Date(profile.updatedAt).toLocaleString();

  const handleCopyAll = async () => {
    const content = SECTION_CONFIG
      .map((section) => `${section.title}:\n${fields[section.field] || ""}`)
      .join("\n\n");

    try {
      await navigator.clipboard.writeText(content);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Business Model</CardTitle>
            <CardDescription className="mt-1">
              Separate strategic context that your AI assistants can always read.
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyAll}
              className="bg-white/10 border-white/20 text-zinc-100 hover:bg-white/20"
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy All
            </Button>
            <div className="space-y-2 text-right">
              <Badge className="bg-white/14 text-zinc-100">
                <Clock3 className="mr-1 h-3.5 w-3.5" />
                {saveLabel}
              </Badge>
              <p className="text-xs text-zinc-500">
                Updated: {updatedAtLabel}
                {profile.updatedBy ? ` by ${profile.updatedBy.name}` : ""}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-zinc-300" />
          <CardTitle>AI Context Rule</CardTitle>
        </div>
        <CardDescription>
          Keep &quot;AI Summary&quot; short and current. AI routes use it first, then detailed sections when needed.
        </CardDescription>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        {SECTION_CONFIG.map((section) => (
          <Card key={section.field} className={section.field === "aiSummary" ? "xl:col-span-2" : ""}>
            <CardTitle>{section.title}</CardTitle>
            <CardDescription className="mt-1">{section.description}</CardDescription>
            <Textarea
              value={fields[section.field]}
              onChange={(event) => onFieldChange(section.field, event.target.value)}
              className={`mt-3 min-h-32 ${section.className ?? ""}`}
              placeholder={section.placeholder}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="none"
            />
          </Card>
        ))}
      </div>
    </div>
  );
}
