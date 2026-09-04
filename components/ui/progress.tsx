import { cn } from "@/lib/utils";

type ProgressProps = {
  /** 0~100 범위를 벗어나면 clamp 된다. */
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
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-slate-800",
        className
      )}
    >
      <div
        className={cn(
          "h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-[width] duration-500",
          indicatorClassName
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
