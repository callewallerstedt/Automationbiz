import { ReactNode } from "react";
import { CommandPalette } from "@/components/layout/command-palette";
import { GlobalSearch } from "@/components/layout/global-search";
import { Sidebar } from "@/components/layout/sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-zinc-900 text-zinc-100">
      <div className="pointer-events-none absolute left-[-9rem] top-[-6rem] h-72 w-72 rounded-full bg-white/6 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-10rem] right-[-8rem] h-80 w-80 rounded-full bg-white/5 blur-3xl" />
      <div className="relative mx-auto flex max-w-[1500px]">
        <Sidebar />
        <div className="min-h-screen flex-1">
          <header className="frost-pane sticky top-0 z-30 px-4 py-3 md:px-6">
            <div className="flex items-center gap-3">
              <GlobalSearch />
              <CommandPalette />
            </div>
          </header>
          <main className="px-4 py-6 md:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

