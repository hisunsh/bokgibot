import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = {
  primary:
    "bg-emerald-500 text-emerald-950 hover:bg-emerald-400 disabled:hover:bg-emerald-500",
  secondary:
    "border border-surface-border bg-slate-800/60 text-slate-200 hover:bg-slate-800",
  ghost: "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100",
} as const;

const buttonSizes = {
  sm: "h-8 gap-1.5 px-3 text-xs",
  md: "h-10 gap-2 px-4 text-sm",
  lg: "h-11 gap-2 px-5 text-sm",
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
        "inline-flex items-center justify-center rounded-xl font-semibold transition-colors",
        "focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        buttonVariants[variant],
        buttonSizes[size],
        className
      )}
      {...props}
    />
  );
}
