import * as React from "react";
import { cn } from "@/lib/utils";

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 rounded-xl px-3 text-sm text-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-white/20 bg-white/10 hover:bg-white/15 focus:bg-white/15",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

