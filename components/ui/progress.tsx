import { cn } from "@/lib/utils";

type ProgressProps = {
  value: number;
  className?: string;
  indicatorClassName?: string;
  label?: string;
};

export function Progress({
  value,
  className,
  indicatorClassName,
  label,
}: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-label={label}
      className={cn("h-1 w-full overflow-hidden bg-[#2a2e39]", className)}
    >
      <div
        className={cn("bg-profit h-full transition-[width] duration-300", indicatorClassName)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
