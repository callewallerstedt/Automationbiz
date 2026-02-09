"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "lucide-react";
import { Button } from "@/components/ui/button";

const entries = [
  { label: "Go to Home", href: "/home" },
  { label: "Open Pipeline", href: "/pipeline" },
  { label: "Open Tasks", href: "/tasks" },
  { label: "Open Demo Lab", href: "/demo-lab" },
  { label: "Create Lead", href: "/pipeline" },
  { label: "Add Task", href: "/tasks" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((state) => !state);
      }

      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)} className="hidden gap-2 md:inline-flex">
        <Command className="h-4 w-4" />
        Command
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 bg-black/60 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="mx-auto mt-20 max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-4" onClick={(event) => event.stopPropagation()}>
            <p className="mb-3 text-xs uppercase tracking-wider text-zinc-500">Command Palette</p>
            <div className="space-y-1">
              {entries.map((entry) => (
                <button
                  key={entry.label}
                  onClick={() => {
                    setOpen(false);
                    router.push(entry.href);
                  }}
                  className="w-full rounded-xl px-3 py-2 text-left text-sm text-zinc-200 transition hover:bg-zinc-900"
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

