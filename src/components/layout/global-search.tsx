"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type SearchResults = {
  companies: { id: string; name: string }[];
  tasks: { id: string; title: string }[];
  projects: { id: string; name: string }[];
};

const initialState: SearchResults = { companies: [], tasks: [], projects: [] };

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(initialState);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (!query.trim()) {
        setResults(initialState);
        return;
      }

      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = (await response.json()) as SearchResults;
      setResults(data);
    }, 220);

    return () => clearTimeout(timeout);
  }, [query]);

  const hasResults = useMemo(
    () => results.companies.length > 0 || results.tasks.length > 0 || results.projects.length > 0,
    [results],
  );

  return (
    <div className="relative w-full max-w-lg">
      <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-zinc-500" />
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search companies, tasks, projects..."
        className="pl-9"
      />

      {query && hasResults ? (
        <div className="absolute z-20 mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-950/95 p-3 shadow-xl backdrop-blur">
          {results.companies.length ? (
            <div className="mb-2">
              <p className="mb-1 text-xs uppercase tracking-wider text-zinc-500">Companies</p>
              {results.companies.map((company) => (
                <Link
                  key={company.id}
                  href={`/companies/${company.id}`}
                  className="block rounded-lg px-2 py-1.5 text-sm text-zinc-200 transition hover:bg-zinc-900"
                >
                  {company.name}
                </Link>
              ))}
            </div>
          ) : null}

          {results.tasks.length ? (
            <div className="mb-2">
              <p className="mb-1 text-xs uppercase tracking-wider text-zinc-500">Tasks</p>
              {results.tasks.map((task) => (
                <Link key={task.id} href="/tasks" className="block rounded-lg px-2 py-1.5 text-sm text-zinc-200 transition hover:bg-zinc-900">
                  {task.title}
                </Link>
              ))}
            </div>
          ) : null}

          {results.projects.length ? (
            <div>
              <p className="mb-1 text-xs uppercase tracking-wider text-zinc-500">Projects</p>
              {results.projects.map((project) => (
                <Link
                  key={project.id}
                  href="/home"
                  className="block rounded-lg px-2 py-1.5 text-sm text-zinc-200 transition hover:bg-zinc-900"
                >
                  {project.name}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

