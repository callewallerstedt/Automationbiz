import Link from "next/link";
import { Select } from "@/components/ui/select";
import { PipelineBoard } from "@/components/pipeline/pipeline-board";
import { Card, CardTitle } from "@/components/ui/card";
import { STAGE_LABELS } from "@/lib/constants";
import { getPipelineData } from "@/lib/data";

type PipelinePageProps = {
  searchParams: Promise<{ industry?: string; ownerId?: string; location?: string }>;
};

export default async function PipelinePage({ searchParams }: PipelinePageProps) {
  const params = await searchParams;
  const data = await getPipelineData(params);

  return (
    <div className="space-y-5">
      <Card>
        <CardTitle className="mb-3">Pipeline Filters</CardTitle>
        <form className="grid gap-3 md:grid-cols-4" action="/pipeline">
          <Select name="industry" defaultValue={params.industry ?? "all"}>
            <option value="all">All industries</option>
            {data.industries.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </Select>

          <Select name="ownerId" defaultValue={params.ownerId ?? "all"}>
            <option value="all">All owners</option>
            {data.users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </Select>

          <Select name="location" defaultValue={params.location ?? "all"}>
            <option value="all">All locations</option>
            {data.locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </Select>

          <button type="submit" className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-100 hover:bg-zinc-800">
            Apply
          </button>
        </form>
      </Card>

      <PipelineBoard
        initialCompanies={data.companies.map((company) => ({
          id: company.id,
          name: company.name,
          industry: company.industry,
          location: company.location,
          stage: company.stage,
          painPoints: company.painPoints,
          nextActionDate: company.nextActionDate?.toISOString() ?? null,
          owner: { id: company.owner.id, name: company.owner.name },
          tasks: company.tasks.map((task) => ({ id: task.id })),
          projects: company.projects.map((project) => ({ id: project.id })),
        }))}
      />

      <Card>
        <CardTitle className="mb-2">Company Directory</CardTitle>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {data.companies.map((company) => (
            <Link
              key={company.id}
              href={`/companies/${company.id}`}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-sm text-zinc-200 hover:bg-zinc-800"
            >
              <p className="font-semibold">{company.name}</p>
              <p className="text-xs text-zinc-500">
                {company.industry} - {company.location}
              </p>
              <p className="mt-1 text-xs text-zinc-400">{STAGE_LABELS[company.stage]}</p>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
