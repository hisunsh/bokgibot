import {
  ArrowDownRight,
  ArrowUpRight,
  Receipt,
  Scale,
  Target,
  Wallet,
} from "lucide-react";

import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { formatPercent, formatUsd } from "@/lib/format";
import type { PerformanceSummary } from "@/lib/types";

type PerformanceSummaryGridProps = {
  summary: PerformanceSummary;
};

/** 전주 대비 증감을 화살표 + 색상으로 표시하는 델타 뱃지 */
function DeltaBadge({ value, suffix }: { value: number; suffix: string }) {
  const isUp = value >= 0;
  const Icon = isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <Badge variant={isUp ? "profit" : "loss"}>
      <Icon className="size-3" aria-hidden />
      {suffix}
    </Badge>
  );
}

export function PerformanceSummaryGrid({
  summary,
}: PerformanceSummaryGridProps) {
  const totalTrades = summary.wins + summary.losses;

  return (
    <section
      aria-label="핵심 성과 지표"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      <StatCard
        label="총 실현 손익 (Net PnL)"
        value={formatUsd(summary.netPnl, { signed: true })}
        icon={Wallet}
        tone={summary.netPnl >= 0 ? "profit" : "loss"}
        delta={
          <DeltaBadge
            value={summary.netPnlChangePercent}
            suffix={formatPercent(summary.netPnlChangePercent, { signed: true })}
          />
        }
        hint={<>수수료 차감 후 순이익 · 전주 대비</>}
      />

      <StatCard
        label="승률 (Win Rate)"
        value={formatPercent(summary.winRate)}
        icon={Target}
        tone="neutral"
        delta={
          <Badge variant="info">
            {totalTrades}건
          </Badge>
        }
        hint={
          <span className="flex items-center gap-1.5">
            <span className="text-profit-soft font-semibold">
              {summary.wins}승
            </span>
            <span className="text-slate-700">·</span>
            <span className="text-loss-soft font-semibold">
              {summary.losses}패
            </span>
          </span>
        }
      />

      <StatCard
        label="평균 손익비 (Profit Factor)"
        // 손실 거래가 없으면 무한대(null)이므로 숫자 대신 기호로 표시한다.
        value={
          summary.profitFactor === null
            ? "∞"
            : summary.profitFactor.toFixed(2)
        }
        icon={Scale}
        tone={
          summary.profitFactor === null || summary.profitFactor >= 1
            ? "profit"
            : "loss"
        }
        delta={
          <DeltaBadge
            value={summary.profitFactorChange}
            suffix={`${summary.profitFactorChange >= 0 ? "+" : "-"}${Math.abs(
              summary.profitFactorChange
            ).toFixed(2)}`}
          />
        }
        hint={<>총이익 ÷ 총손실 (R:R) · 1.0 이상이면 기대값 플러스</>}
      />

      <StatCard
        label="누적 수수료 지출 (Total Fees)"
        value={formatUsd(-summary.totalFees)}
        icon={Receipt}
        tone="loss"
        delta={<Badge variant="loss">{formatPercent(summary.feeRatio)}</Badge>}
        hint={<>총 손익 규모(총이익+총손실) 대비 {formatPercent(summary.feeRatio)}</>}
      />
    </section>
  );
}
