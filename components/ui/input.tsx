import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "border-surface-border h-9 w-full rounded-sm border bg-[#131722] px-3 text-[13px] text-[#d1d4dc]",
        "placeholder:text-[#4c525e]",
        "focus:border-profit/70 focus:outline-none",
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
        "flex items-center gap-1.5 text-[11px] font-medium text-[#787b86]",
        className
      )}
      {...props}
    />
  );
}
