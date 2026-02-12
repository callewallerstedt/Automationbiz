import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "frost-input min-h-28 w-full rounded-xl px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-white/20",
          className,
          "resize-y",
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

