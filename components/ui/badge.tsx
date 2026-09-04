import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const badgeVariants = {
  default: "border-slate-700 bg-slate-800/80 text-slate-300",
  vip: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  long: "border-profit/30 bg-profit/10 text-profit-soft",
  short: "border-loss/30 bg-loss/10 text-loss-soft",
  profit: "border-profit/30 bg-profit/10 text-profit-soft",
  loss: "border-loss/30 bg-loss/10 text-loss-soft",
  tag: "border-slate-700/70 bg-slate-800/50 text-slate-400",
  info: "border-sky-400/30 bg-sky-400/10 text-sky-300",
} as const;

export type BadgeVariant = keyof typeof badgeVariants;

type BadgeProps = ComponentProps<"span"> & {
  variant?: BadgeVariant;
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] leading-5 font-medium whitespace-nowrap",
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  );
}
