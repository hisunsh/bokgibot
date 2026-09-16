"use client";

import { Activity, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatPercent, formatUsd } from "@/lib/format";
import type { EquityPoint } from "@/lib/types";
import { cn } from "@/lib/utils";

const RANGES = [
  { id: "7d", label: "7일", days: 7 },
  { id: "14d", label: "14일", days: 14 },
  { id: "all", label: "전체", days: Number.POSITIVE_INFINITY },
] as const;

type RangeId = (typeof RANGES)[number]["id"];

type PnlChartProps = {
  data: EquityPoint[];
};

function ChartTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload as EquityPoint | undefined;
  if (!point) return null;

  const isDailyUp = point.dailyPnl >= 0;

  return (
    <div className="border-surface-border bg-surface-raised rounded-sm border px-3 py-2">
      <p className="text-[11px] font-medium text-[#787b86]">{point.date}</p>
      <p className="tabular mt-1 text-sm font-semibold text-[#f0f3fa]">
        누적 {formatUsd(point.cumulativePnl, { signed: true })}
      </p>
      <p
        className={cn(
          "tabular mt-0.5 flex items-center gap-1 text-[11px] font-semibold",
          isDailyUp ? "text-profit-soft" : "text-loss-soft"
        )}
      >
        {isDailyUp ? (
          <TrendingUp className="size-3" aria-hidden />
        ) : (
          <TrendingDown className="size-3" aria-hidden />
        )}
        당일 {formatUsd(point.dailyPnl, { signed: true })}
      </p>
    </div>
  );
}

export function PnlChart({ data }: PnlChartProps) {
  const [range, setRange] = useState<RangeId>("all");

  const visible = useMemo(() => {
    const days = RANGES.find((item) => item.id === range)?.days ?? Infinity;
    return Number.isFinite(days) ? data.slice(-days) : data;
  }, [data, range]);

  const latest = visible.at(-1)?.cumulativePnl ?? 0;
  const first = visible.at(0)?.cumulativePnl ?? 0;
  const periodPnl = latest - (visible.length > 1 ? first : 0);
  const isUp = latest >= 0;
  const peak = Math.max(...visible.map((point) => point.cumulativePnl), 0);
  /** 최고점 대비 현재 낙폭 (MDD 대용 지표) */
  const drawdown = peak > 0 ? ((latest - peak) / peak) * 100 : 0;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <CardTitle>
            일별 누적 손익
          </CardTitle>
          <CardDescription>
            수수료를 차감한 실현 손익 기준 · KST 마감 집계
          </CardDescription>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={cn(
                "tabular text-2xl font-bold tracking-tight",
                isUp ? "text-profit" : "text-loss"
              )}
            >
              {formatUsd(latest, { signed: true })}
            </span>
            <Badge variant={periodPnl >= 0 ? "profit" : "loss"}>
              {periodPnl >= 0 ? (
                <TrendingUp className="size-3" aria-hidden />
              ) : (
                <TrendingDown className="size-3" aria-hidden />
              )}
              구간 {formatUsd(periodPnl, { signed: true })}
            </Badge>
          </div>
        </div>

        <div
          role="group"
          aria-label="기간 선택"
          className="border-surface-border flex shrink-0 rounded-sm border bg-[#131722] p-px"
        >
          {RANGES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setRange(item.id)}
              aria-pressed={range === item.id}
              className={cn(
                "rounded-sm px-2.5 py-1 text-[11px] font-medium transition-colors",
                range === item.id
                  ? "bg-surface-overlay text-[#f0f3fa]"
                  : "text-[#787b86] hover:text-[#d1d4dc]"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </CardHeader>

      <div className="min-h-[260px] flex-1 px-2 pb-2">
        {visible.length === 0 ? (
          <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-2 text-center">
            <Activity className="size-6 text-slate-700" aria-hidden />
            <p className="text-xs text-slate-500">
              표시할 손익 데이터가 없습니다.
            </p>
            <p className="text-[11px] text-slate-600">
              API를 연동하거나 조회 기간을 늘려 보세요.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minHeight={260}>
            <AreaChart
              data={visible}
              margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#26a69a" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="#26a69a" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                stroke="#2b3240"
                strokeDasharray="2 4"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                stroke="#434651"
                tick={{ fontSize: 11, fill: "#787b86" }}
                tickLine={false}
                axisLine={{ stroke: "#2b3240" }}
                minTickGap={24}
              />
              <YAxis
                stroke="#434651"
                tick={{ fontSize: 11, fill: "#787b86" }}
                tickLine={false}
                axisLine={false}
                width={64}
                tickFormatter={(value: number) =>
                  formatUsd(value, { decimals: 0 })
                }
              />
              <ReferenceLine y={0} stroke="#363a45" strokeWidth={1} />
              <Tooltip
                content={ChartTooltip}
                cursor={{ stroke: "#26a69a", strokeDasharray: "3 3" }}
              />
              <Area
                type="linear"
                dataKey="cumulativePnl"
                name="누적 손익"
                stroke="#26a69a"
                strokeWidth={1.5}
                fill="url(#pnlGradient)"
                dot={false}
                activeDot={{
                  r: 3,
                  fill: "#26a69a",
                  stroke: "#131722",
                  strokeWidth: 1,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="border-surface-border grid grid-cols-3 divide-x divide-[#2b3240] border-t text-center">
        <div className="px-3 py-2.5">
          <p className="text-[10px] text-[#787b86]">최고 누적</p>
          <p className="tabular text-profit text-xs font-semibold">
            {formatUsd(peak, { signed: true })}
          </p>
        </div>
        <div className="px-3 py-2.5">
          <p className="text-[10px] text-[#787b86]">고점 대비</p>
          <p
            className={cn(
              "tabular text-xs font-semibold",
              drawdown < 0 ? "text-loss" : "text-slate-300"
            )}
          >
            {formatPercent(drawdown, { signed: true, decimals: 2 })}
          </p>
        </div>
        <div className="px-3 py-2.5">
          <p className="text-[10px] text-[#787b86]">집계 일수</p>
          <p className="tabular text-xs font-semibold text-[#d1d4dc]">
            {visible.length}일
          </p>
        </div>
      </div>
    </Card>
  );
}
