import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "border-surface-border h-10 w-full rounded-xl border bg-slate-950/60 px-3 text-sm text-slate-100",
        "placeholder:text-slate-600",
        "focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    />
  );
}

type LabelProps = ComponentProps<"label">;

export function Label({ className, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        "flex items-center gap-1.5 text-xs font-medium text-slate-400",
        className
      )}
      {...props}
    />
  );
}
