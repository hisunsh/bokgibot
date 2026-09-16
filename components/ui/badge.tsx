import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const badgeVariants = {
  default: "border-surface-border bg-surface-overlay text-[#b2b5be]",
  vip: "border-[#5d4a1f] bg-[#3a3118] text-[#d1b15a]",
  long: "border-profit/35 bg-profit/10 text-profit-soft",
  short: "border-loss/35 bg-loss/10 text-loss-soft",
  profit: "border-profit/35 bg-profit/10 text-profit-soft",
  loss: "border-loss/35 bg-loss/10 text-loss-soft",
  tag: "border-surface-border bg-[#181c27] text-[#787b86]",
  info: "border-[#2962ff]/30 bg-[#2962ff]/10 text-[#90caf9]",
} as const;

export type BadgeVariant = keyof typeof badgeVariants;

type BadgeProps = ComponentProps<"span"> & {
  variant?: BadgeVariant;
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border px-1.5 py-px text-[10px] leading-5 font-medium whitespace-nowrap",
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  );
}
