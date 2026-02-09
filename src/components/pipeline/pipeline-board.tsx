"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  type DraggableAttributes,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { PipelineStage } from "@prisma/client";
import { formatDistanceToNowStrict } from "date-fns";
import { MoreHorizontal, Pencil, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PIPELINE_STAGES, STAGE_COLORS, STAGE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

type CompanyItem = {
  id: string;
  name: string;
  industry: string;
  location: string;
  stage: PipelineStage;
  painPoints?: string;
  nextActionDate: string | null;
  owner: { id: string; name: string };
  tasks: { id: string }[];
  projects: { id: string }[];
};

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="mx-auto mt-20 max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950 p-4" onClick={(event) => event.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
          <button type="button" className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function StageColumn({
  stage,
  count,
  children,
}: {
  stage: PipelineStage;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-96 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3 transition duration-200",
        isOver && "border-sky-400/60 bg-sky-500/10",
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <Badge className={STAGE_COLORS[stage]}>{STAGE_LABELS[stage]}</Badge>
        <span className="text-xs text-zinc-500">{count}</span>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function CompanyMenu({
  company,
  onRename,
  onEdit,
  onDelete,
}: {
  company: CompanyItem;
  onRename: (company: CompanyItem) => void;
  onEdit: (company: CompanyItem) => void;
  onDelete: (company: CompanyItem) => void;
}) {
  return (
    <details className="group relative">
      <summary
        onPointerDown={(event) => event.stopPropagation()}
        className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
      >
        <MoreHorizontal className="h-4 w-4" />
      </summary>
      <div className="absolute right-0 top-9 z-30 w-40 rounded-xl border border-zinc-800 bg-zinc-950 p-1.5 shadow-xl">
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onRename(company)}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-zinc-200 hover:bg-zinc-900"
        >
          <Pencil className="h-3.5 w-3.5" />
          Rename
        </button>
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onEdit(company)}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-zinc-200 hover:bg-zinc-900"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onDelete(company)}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-rose-300 hover:bg-zinc-900"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>
    </details>
  );
}

function CompanyCard({
  company,
  dragging,
  listeners,
  attributes,
  setNodeRef,
  style,
  onRename,
  onEdit,
  onDelete,
}: {
  company: CompanyItem;
  dragging?: boolean;
  listeners?: ReturnType<typeof useDraggable>["listeners"];
  attributes?: DraggableAttributes;
  setNodeRef?: (node: HTMLElement | null) => void;
  style?: React.CSSProperties;
  onRename: (company: CompanyItem) => void;
  onEdit: (company: CompanyItem) => void;
  onDelete: (company: CompanyItem) => void;
}) {
  return (
    <Card
      ref={setNodeRef as never}
      style={style}
      className={cn("cursor-grab p-3 shadow-none will-change-transform", dragging && "cursor-grabbing opacity-50")}
      {...(listeners ?? {})}
      {...(attributes ?? {})}
    >
      <div className="mb-2 flex items-start justify-end gap-2">
        <CompanyMenu company={company} onRename={onRename} onEdit={onEdit} onDelete={onDelete} />
      </div>

      <Link href={`/companies/${company.id}`} className="mb-2 block text-sm font-semibold text-zinc-100 hover:text-sky-300">
        {company.name}
      </Link>
      <p className="text-xs text-zinc-400">{company.industry}</p>
      <p className="text-xs text-zinc-500">{company.location}</p>
      <p className="mt-2 text-xs text-zinc-300">Owner: {company.owner.name}</p>
      <p className="text-xs text-zinc-400">
        Open tasks: {company.tasks.length} | Projects: {company.projects.length}
      </p>
      <p className="mt-2 text-xs text-zinc-500">
        Next action: {company.nextActionDate ? `${formatDistanceToNowStrict(new Date(company.nextActionDate), { addSuffix: true })}` : "Not set"}
      </p>
    </Card>
  );
}

function DraggableCompanyCard({
  company,
  onRename,
  onEdit,
  onDelete,
}: {
  company: CompanyItem;
  onRename: (company: CompanyItem) => void;
  onEdit: (company: CompanyItem) => void;
  onDelete: (company: CompanyItem) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: company.id,
    data: { stage: company.stage },
  });

  return (
    <CompanyCard
      company={company}
      dragging={isDragging}
      listeners={listeners}
      attributes={attributes}
      setNodeRef={setNodeRef as (node: HTMLElement | null) => void}
      style={{ transform: CSS.Translate.toString(transform) }}
      onRename={onRename}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
}

export function PipelineBoard({ initialCompanies }: { initialCompanies: CompanyItem[] }) {
  const [companies, setCompanies] = useState(initialCompanies);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const [renameCompany, setRenameCompany] = useState<CompanyItem | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [editCompany, setEditCompany] = useState<CompanyItem | null>(null);
  const [editIndustry, setEditIndustry] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editPainPoints, setEditPainPoints] = useState("");
  const [editNextActionDate, setEditNextActionDate] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const grouped = useMemo(() => {
    return PIPELINE_STAGES.reduce((acc, stage) => {
      acc[stage] = companies.filter((company) => company.stage === stage);
      return acc;
    }, {} as Record<PipelineStage, CompanyItem[]>);
  }, [companies]);

  const activeCompany = useMemo(
    () => (activeCompanyId ? companies.find((company) => company.id === activeCompanyId) ?? null : null),
    [activeCompanyId, companies],
  );

  const patchCompany = async (companyId: string, payload: Record<string, unknown>) => {
    const response = await fetch(`/api/companies/${companyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) return null;
    return (await response.json()) as {
      id: string;
      name: string;
      industry: string;
      location: string;
      stage: PipelineStage;
      painPoints: string;
      nextActionDate: string | null;
      owner: { id: string; name: string };
      tasks: { id: string }[];
      projects: { id: string }[];
    };
  };

  const openRename = (company: CompanyItem) => {
    setRenameCompany(company);
    setRenameValue(company.name);
  };

  const openEdit = (company: CompanyItem) => {
    setEditCompany(company);
    setEditIndustry(company.industry);
    setEditLocation(company.location);
    setEditPainPoints(company.painPoints ?? "");
    setEditNextActionDate(company.nextActionDate ? company.nextActionDate.slice(0, 10) : "");
  };

  const onSaveRename = async () => {
    if (!renameCompany || !renameValue.trim()) return;

    const updated = await patchCompany(renameCompany.id, { name: renameValue.trim() });
    if (updated) {
      setCompanies((prev) => prev.map((item) => (item.id === renameCompany.id ? { ...item, name: updated.name } : item)));
    }
    setRenameCompany(null);
  };

  const onSaveEdit = async () => {
    if (!editCompany || !editIndustry.trim() || !editLocation.trim()) return;

    const updated = await patchCompany(editCompany.id, {
      industry: editIndustry.trim(),
      location: editLocation.trim(),
      painPoints: editPainPoints.trim() || "No pain points recorded",
      nextActionDate: editNextActionDate || null,
    });

    if (updated) {
      setCompanies((prev) =>
        prev.map((item) =>
          item.id === editCompany.id
            ? {
                ...item,
                industry: updated.industry,
                location: updated.location,
                painPoints: updated.painPoints,
                nextActionDate: updated.nextActionDate,
              }
            : item,
        ),
      );
    }
    setEditCompany(null);
  };

  const onDelete = async (company: CompanyItem) => {
    if (!window.confirm(`Delete ${company.name}?`)) return;

    const response = await fetch(`/api/companies/${company.id}`, { method: "DELETE" });
    if (!response.ok) return;

    setCompanies((prev) => prev.filter((item) => item.id !== company.id));
  };

  const onDragStart = (event: DragStartEvent) => {
    setActiveCompanyId(event.active.id as string);
  };

  const onDragCancel = () => {
    setActiveCompanyId(null);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const destination = event.over?.id as PipelineStage | undefined;
    const companyId = event.active.id as string;
    setActiveCompanyId(null);

    if (!destination) return;

    const current = companies.find((company) => company.id === companyId);
    if (!current || current.stage === destination) return;

    setCompanies((prev) => prev.map((company) => (company.id === companyId ? { ...company, stage: destination } : company)));

    startTransition(async () => {
      await fetch(`/api/companies/${companyId}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: destination }),
      });
    });
  };

  return (
    <>
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragCancel={onDragCancel} onDragEnd={onDragEnd}>
        <div className="grid gap-4 md:grid-cols-3 2xl:grid-cols-7">
          {PIPELINE_STAGES.map((stage) => (
            <StageColumn key={stage} stage={stage} count={grouped[stage].length}>
              {grouped[stage].map((company) => (
                <DraggableCompanyCard key={company.id} company={company} onRename={openRename} onEdit={openEdit} onDelete={onDelete} />
              ))}
            </StageColumn>
          ))}
        </div>

        <DragOverlay>
          {activeCompany ? (
            <div className="w-72">
              <CompanyCard company={activeCompany} dragging onRename={openRename} onEdit={openEdit} onDelete={onDelete} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {renameCompany ? (
        <ModalShell title="Rename Company" onClose={() => setRenameCompany(null)}>
          <div className="space-y-3">
            <Input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRenameCompany(null)}>
                Cancel
              </Button>
              <Button onClick={onSaveRename}>Save</Button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {editCompany ? (
        <ModalShell title="Edit Company" onClose={() => setEditCompany(null)}>
          <div className="grid gap-3 md:grid-cols-2">
            <Input value={editIndustry} onChange={(event) => setEditIndustry(event.target.value)} placeholder="Industry" />
            <Input value={editLocation} onChange={(event) => setEditLocation(event.target.value)} placeholder="Location" />
            <Input type="date" value={editNextActionDate} onChange={(event) => setEditNextActionDate(event.target.value)} className="md:col-span-2" />
            <Textarea value={editPainPoints} onChange={(event) => setEditPainPoints(event.target.value)} className="min-h-24 md:col-span-2" />
            <div className="flex justify-end gap-2 md:col-span-2">
              <Button variant="ghost" onClick={() => setEditCompany(null)}>
                Cancel
              </Button>
              <Button onClick={onSaveEdit}>Save</Button>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </>
  );
}
