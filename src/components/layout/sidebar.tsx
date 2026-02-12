"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BriefcaseBusiness, Building2, ClipboardCheck, FlaskConical, House, KanbanSquare, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/home", label: "Home", icon: House },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/tasks", label: "Tasks", icon: ClipboardCheck },
  { href: "/business-model", label: "Business Model", icon: ScrollText },
  { href: "/demo-lab", label: "Demo Lab", icon: FlaskConical },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="frost-pane sticky top-0 hidden h-screen w-64 shrink-0 p-5 md:block">
      <div className="mb-8 flex items-center gap-3">
        <div className="frost-pane-strong rounded-xl p-2 text-zinc-100">
          <BriefcaseBusiness className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-100">Automation Biz</p>
          <p className="text-xs text-zinc-400">Internal Dashboard</p>
        </div>
      </div>

      <nav className="space-y-1">
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition duration-200",
                active ? "frost-pane-strong text-zinc-100" : "text-zinc-400 hover:bg-white/10 hover:text-zinc-100",
              )}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="frost-pane-soft mt-8 rounded-2xl p-4">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          <Building2 className="h-3.5 w-3.5" />
          Focus today
        </p>
        <p className="mt-2 text-sm text-zinc-200">Review open tasks, send follow-ups, and move priority companies forward.</p>
      </div>
    </aside>
  );
}

