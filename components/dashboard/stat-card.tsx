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
  hint?: ReactNode;
  delta?: ReactNode;
};

const toneStyles: Record<StatTone, string> = {
  profit: "text-profit",
  loss: "text-loss",
  neutral: "text-[#f0f3fa]",
};

export function StatCard({
  label,
  value,
  tone = "neutral",
  hint,
  delta,
}: StatCardProps) {
  return (
    <Card className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] text-[#787b86]">{label}</p>
        {delta}
      </div>
      <p className={cn("tabular mt-2 text-xl font-semibold tracking-tight", toneStyles[tone])}>
        {value}
      </p>
      {hint ? <div className="mt-1.5 text-[11px] text-[#5d606b]">{hint}</div> : null}
    </Card>
  );
}
