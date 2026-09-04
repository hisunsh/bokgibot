import { CalendarDays, Crown, Gift, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatPercent, formatVolume } from "@/lib/format";
import type { ReferralStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type ReferralProgressCardProps = {
  status: ReferralStatus;
  className?: string;
};

export function ReferralProgressCard({
  status,
  className,
}: ReferralProgressCardProps) {
  const { currentVolume, requiredVolume, daysLeft } = status;
  const achievement = (currentVolume / requiredVolume) * 100;
  const isQualified = currentVolume >= requiredVolume;
  const remaining = Math.max(0, requiredVolume - currentVolume);

  return (
    <div
      className={cn(
        "border-surface-border bg-surface-raised/60 w-full rounded-xl border px-4 py-3 lg:w-[380px]",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
          <Gift className="size-3.5 text-amber-300" aria-hidden />
          이번 달 VIP 무료 이용 기준
          <span className="hidden text-slate-500 sm:inline">
            (레퍼럴 거래량 달성률)
          </span>
        </p>
        <Badge variant={isQualified ? "profit" : "vip"}>
          <Crown className="size-3" aria-hidden />
          {formatPercent(achievement, { decimals: 0 })}
        </Badge>
      </div>

      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="tabular text-base font-semibold text-slate-100">
          {formatVolume(currentVolume)}
        </span>
        <span className="tabular text-xs text-slate-500">
          / {formatVolume(requiredVolume)} USDT
        </span>
      </div>

      <Progress
        value={achievement}
        className="mt-2"
        label="레퍼럴 거래량 달성률"
        indicatorClassName={
          isQualified
            ? undefined
            : "from-amber-500 to-amber-300"
        }
      />

      <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
        <span
          className={cn(
            "flex items-center gap-1 font-medium",
            isQualified ? "text-profit-soft" : "text-amber-300"
          )}
        >
          <TrendingUp className="size-3" aria-hidden />
          {isQualified
            ? "VIP 무료 혜택 유지 중"
            : `VIP 무료 혜택 유지 중 · ${formatVolume(remaining)} 남음`}
        </span>
        <span className="flex items-center gap-1 text-slate-500">
          <CalendarDays className="size-3" aria-hidden />
          정산 D-{daysLeft}
        </span>
      </div>
    </div>
  );
}
