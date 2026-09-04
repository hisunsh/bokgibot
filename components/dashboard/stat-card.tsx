import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatTone = "profit" | "loss" | "neutral";

type StatCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: StatTone;
  /** 값 아래 보조 설명 (예: 15승 7패) */
  hint?: ReactNode;
  /** 우측 상단 델타 뱃지 (예: 전주 대비 +18.4%) */
  delta?: ReactNode;
};

const toneStyles: Record<StatTone, { value: string; icon: string }> = {
  profit: {
    value: "text-profit",
    icon: "border-profit/25 bg-profit/10 text-profit",
  },
  loss: {
    value: "text-loss",
    icon: "border-loss/25 bg-loss/10 text-loss",
  },
  neutral: {
    value: "text-slate-100",
    icon: "border-slate-700 bg-slate-800/70 text-slate-300",
  },
};

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  hint,
  delta,
}: StatCardProps) {
  const styles = toneStyles[tone];

  return (
    <Card className="relative overflow-hidden p-5">
      {/* 톤에 맞춘 미묘한 상단 글로우 */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-16 -right-10 size-32 rounded-full blur-3xl",
          tone === "profit" && "bg-emerald-500/10",
          tone === "loss" && "bg-red-500/10",
          tone === "neutral" && "bg-slate-400/5"
        )}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-lg border",
              styles.icon
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
          <p className="text-xs font-medium text-slate-400">{label}</p>
        </div>
        {delta}
      </div>

      <p
        className={cn(
          "tabular relative mt-4 text-2xl font-bold tracking-tight",
          styles.value
        )}
      >
        {value}
      </p>

      {hint ? (
        <div className="relative mt-2 text-[11px] text-slate-500">{hint}</div>
      ) : null}
    </Card>
  );
}
