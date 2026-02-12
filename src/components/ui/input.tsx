import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "frost-input h-10 w-full rounded-xl px-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-white/20",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

