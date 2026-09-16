import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = {
  primary:
    "bg-profit text-[#131722] hover:bg-profit-soft disabled:hover:bg-profit",
  secondary:
    "border border-surface-border bg-surface-overlay text-[#d1d4dc] hover:bg-[#363a45]",
  ghost: "text-[#787b86] hover:bg-surface-overlay hover:text-[#d1d4dc]",
} as const;

const buttonSizes = {
  sm: "h-7 gap-1.5 px-2.5 text-[11px]",
  md: "h-9 gap-2 px-3.5 text-[13px]",
  lg: "h-10 gap-2 px-4 text-[13px]",
} as const;

type ButtonProps = ComponentProps<"button"> & {
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-sm font-medium transition-colors",
        "focus-visible:ring-profit/50 focus-visible:ring-offset-surface-base focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        buttonVariants[variant],
        buttonSizes[size],
        className
      )}
      {...props}
    />
  );
}
