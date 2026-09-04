"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  CircleDollarSign,
  Filter,
  Hash,
  Receipt,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatDateTime,
  formatPercent,
  formatPrice,
  formatSymbol,
  formatUsd,
} from "@/lib/format";
import type { Trade } from "@/lib/types";
import { cn } from "@/lib/utils";

const FILTERS = [
  { id: "all", label: "전체" },
  { id: "LONG", label: "롱" },
  { id: "SHORT", label: "숏" },
  { id: "win", label: "수익" },
  { id: "loss", label: "손실" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

type TradeHistoryTableProps = {
  trades: Trade[];
};

function matchesFilter(trade: Trade, filter: FilterId) {
  switch (filter) {
    case "LONG":
    case "SHORT":
      return trade.side === filter;
    case "win":
      return trade.netPnl > 0;
    case "loss":
      return trade.netPnl < 0;
    default:
      return true;
  }
}

export function TradeHistoryTable({ trades }: TradeHistoryTableProps) {
  const [filter, setFilter] = useState<FilterId>("all");

  const visible = useMemo(
    () => trades.filter((trade) => matchesFilter(trade, filter)),
    [trades, filter]
  );

  const filteredPnl = visible.reduce((sum, trade) => sum + trade.netPnl, 0);
  const filteredFees = visible.reduce((sum, trade) => sum + trade.fee, 0);

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <CardTitle>
            <Receipt className="text-profit size-4" aria-hidden />
            최근 복기 내역
          </CardTitle>
          <CardDescription>
            청산이 완료된 포지션을 자동으로 기록하고 전략 태그로 분류합니다.
          </CardDescription>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1 text-slate-500">
              <CircleDollarSign className="size-3" aria-hidden />
              합계
              <span
                className={cn(
                  "tabular font-semibold",
                  filteredPnl >= 0 ? "text-profit" : "text-loss"
                )}
              >
                {formatUsd(filteredPnl, { signed: true })}
              </span>
            </span>
            <span className="flex items-center gap-1 text-slate-500">
              수수료
              <span className="tabular text-loss-soft font-semibold">
                {formatUsd(-filteredFees)}
              </span>
            </span>
          </div>

          <div
            role="group"
            aria-label="거래 내역 필터"
            className="border-surface-border flex items-center gap-0.5 rounded-lg border bg-slate-950/60 p-0.5"
          >
            <Filter className="mx-1.5 size-3 text-slate-600" aria-hidden />
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                aria-pressed={filter === item.id}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  filter === item.id
                    ? "bg-slate-700/70 text-slate-100"
                    : "text-slate-500 hover:text-slate-300"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-[1080px] border-collapse text-sm">
          <thead>
            <tr className="border-surface-border border-y bg-slate-950/40 text-[11px] text-slate-500">
              <th scope="col" className="px-5 py-2.5 text-left font-medium">
                체결 일시
              </th>
              <th scope="col" className="px-3 py-2.5 text-left font-medium">
                종목 / 심볼
              </th>
              <th scope="col" className="px-3 py-2.5 text-left font-medium">
                포지션
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">
                진입가
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">
                청산가
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">
                실현 손익
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">
                발생 수수료
              </th>
              <th scope="col" className="px-5 py-2.5 text-left font-medium">
                전략 태그
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((trade) => {
              const isWin = trade.netPnl >= 0;
              const isLong = trade.side === "LONG";
              const SideIcon = isLong ? TrendingUp : TrendingDown;
              const PnlIcon = isWin ? ArrowUpRight : ArrowDownRight;

              return (
                <tr
                  key={trade.id}
                  className="border-surface-border/70 border-b transition-colors last:border-b-0 hover:bg-slate-800/30"
                >
                  <td className="tabular px-5 py-3 text-xs whitespace-nowrap text-slate-400">
                    {formatDateTime(trade.closedAt)}
                  </td>

                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-100">
                        {formatSymbol(trade.symbol)}
                      </span>
                      <span className="tabular text-[10px] text-slate-500">
                        {trade.leverage}x
                      </span>
                    </div>
                  </td>

                  <td className="px-3 py-3">
                    <Badge variant={isLong ? "long" : "short"}>
                      <SideIcon className="size-3" aria-hidden />
                      {trade.side}
                    </Badge>
                  </td>

                  <td className="tabular px-3 py-3 text-right text-xs whitespace-nowrap text-slate-300">
                    {formatPrice(trade.entryPrice)}
                  </td>

                  <td className="tabular px-3 py-3 text-right text-xs whitespace-nowrap text-slate-300">
                    {formatPrice(trade.exitPrice)}
                  </td>

                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    <div
                      className={cn(
                        "tabular flex items-center justify-end gap-1 text-sm font-bold",
                        isWin ? "text-profit" : "text-loss"
                      )}
                    >
                      <PnlIcon className="size-3.5" aria-hidden />
                      {formatUsd(trade.netPnl, { signed: true })}
                    </div>
                    <p
                      className={cn(
                        "tabular text-[11px]",
                        isWin ? "text-profit-soft/80" : "text-loss-soft/80"
                      )}
                    >
                      {formatPercent(trade.pnlPercent, {
                        signed: true,
                        decimals: 2,
                      })}
                    </p>
                  </td>

                  <td className="tabular text-loss-soft/90 px-3 py-3 text-right text-xs whitespace-nowrap">
                    {formatUsd(-trade.fee)}
                  </td>

                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {trade.tags.map((tag) => (
                        <Badge key={tag} variant="tag" title={trade.memo}>
                          <Hash className="size-2.5" aria-hidden />
                          {tag.replace("#", "")}
                        </Badge>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}

            {visible.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-5 py-12 text-center text-xs text-slate-500"
                >
                  {trades.length === 0
                    ? "불러온 거래가 없습니다. API를 연동하거나 조회 기간을 늘려 보세요."
                    : "선택한 조건에 해당하는 거래가 없습니다."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="border-surface-border flex items-center justify-between border-t px-5 py-3 text-[11px] text-slate-500">
        <span>
          총 {trades.length}건 중{" "}
          <span className="font-semibold text-slate-300">{visible.length}건</span>{" "}
          표시
        </span>
        <span>바이낸스 선물 체결 내역 기준 · 자동 동기화</span>
      </div>
    </Card>
  );
}
