import { Flame, Swords, TrendingDown, TrendingUp } from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

type TagPerformance = {
  tag: string;
  pnl: number;
  count: number;
};

type StrategyTagInsightsProps = {
  tags: TagPerformance[];
  /** 상위/하위 몇 개까지 노출할지 */
  limit?: number;
};

export function StrategyTagInsights({
  tags,
  limit = 5,
}: StrategyTagInsightsProps) {
  const best = tags.slice(0, limit);
  const worst = tags.slice(-limit).reverse();

  return (
    <Card className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:gap-8">
      <TagGroup
        title="잘 먹히는 전략"
        icon={<Flame className="text-profit size-3.5" aria-hidden />}
        items={best}
      />
      <div className="border-surface-border hidden h-10 border-l lg:block" />
      <TagGroup
        title="손실을 만드는 습관"
        icon={<Swords className="text-loss size-3.5" aria-hidden />}
        items={worst}
      />
    </Card>
  );
}

function TagGroup({
  title,
  icon,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  items: TagPerformance[];
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
        {icon}
        {title}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => {
          const isUp = item.pnl >= 0;
          return (
            <span
              key={item.tag}
              className={cn(
                "flex items-center gap-1.5 rounded-sm border px-2 py-1 text-[11px]",
                isUp
                  ? "border-profit/25 bg-profit/5"
                  : "border-loss/25 bg-loss/5"
              )}
            >
              {isUp ? (
                <TrendingUp className="text-profit size-3" aria-hidden />
              ) : (
                <TrendingDown className="text-loss size-3" aria-hidden />
              )}
              <span className="font-medium text-slate-300">{item.tag}</span>
              <span
                className={cn(
                  "tabular font-semibold",
                  isUp ? "text-profit-soft" : "text-loss-soft"
                )}
              >
                {formatUsd(item.pnl, { signed: true, decimals: 0 })}
              </span>
              <span className="tabular text-slate-600">{item.count}건</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
