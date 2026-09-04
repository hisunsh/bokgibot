import { asc, eq } from "drizzle-orm";

import {
  buildEquityCurve,
  buildSummary,
  buildTagPerformance,
} from "@/lib/analytics";
import { db } from "@/lib/db/client";
import { syncState, trade, type TradeRow } from "@/lib/db/schema";
import type {
  DashboardSnapshot,
  PositionSide,
  Trade,
} from "@/lib/types";

/**
 * 거래 기록 저장소.
 *
 * 바이낸스는 최근 3개월치만 제공하므로, 여기에 쌓인 기록이 그보다 오래된 구간을
 * 복기할 수 있는 유일한 원본이 된다. (user_id, id) 복합 키라서 겹치는 기간을
 * 다시 동기화해도 중복 없이 덮어써진다.
 */

function toTrade(row: TradeRow): Trade {
  return {
    id: row.id,
    closedAt: new Date(row.closedAt).toISOString(),
    symbol: row.symbol,
    side: row.side as PositionSide,
    leverage: row.leverage,
    entryPrice: row.entryPrice,
    exitPrice: row.exitPrice,
    netPnl: row.netPnl,
    pnlPercent: row.pnlPercent,
    fee: row.fee,
    tags: JSON.parse(row.tags) as string[],
    memo: row.memo ?? undefined,
  };
}

/** 동기화 결과를 트랜잭션으로 반영한다. 일부만 저장되는 상태를 막는다. */
export function persistSnapshot(userId: string, snapshot: DashboardSnapshot) {
  db.transaction((tx) => {
    for (const item of snapshot.trades) {
      const row = {
        id: item.id,
        userId,
        closedAt: new Date(item.closedAt).getTime(),
        symbol: item.symbol,
        side: item.side,
        leverage: item.leverage,
        entryPrice: item.entryPrice,
        exitPrice: item.exitPrice,
        netPnl: item.netPnl,
        pnlPercent: item.pnlPercent,
        fee: item.fee,
        tags: JSON.stringify(item.tags),
        memo: item.memo ?? null,
      };

      tx.insert(trade)
        .values(row)
        .onConflictDoUpdate({
          target: [trade.userId, trade.id],
          set: {
            closedAt: row.closedAt,
            entryPrice: row.entryPrice,
            exitPrice: row.exitPrice,
            netPnl: row.netPnl,
            pnlPercent: row.pnlPercent,
            fee: row.fee,
            leverage: row.leverage,
            tags: row.tags,
            memo: row.memo,
          },
        })
        .run();
    }

    const state = {
      userId,
      syncedAt: new Date(snapshot.syncedAt).getTime(),
      lookbackDays: snapshot.lookbackDays,
      tradedVolume: snapshot.tradedVolume,
      openPositions: snapshot.openPositions,
      symbols: JSON.stringify(snapshot.symbols),
      notes: JSON.stringify(snapshot.notes),
    };

    tx.insert(syncState)
      .values(state)
      .onConflictDoUpdate({
        target: syncState.userId,
        set: {
          syncedAt: state.syncedAt,
          lookbackDays: state.lookbackDays,
          tradedVolume: state.tradedVolume,
          openPositions: state.openPositions,
          symbols: state.symbols,
          notes: state.notes,
        },
      })
      .run();
  });
}

/**
 * 저장된 기록으로 대시보드 스냅샷을 복원한다.
 * 지표는 저장하지 않고 매번 다시 계산하므로, 계산식을 고치면 과거 기록에도 바로 반영된다.
 */
export function loadSnapshot(userId: string): DashboardSnapshot | null {
  const state = db
    .select()
    .from(syncState)
    .where(eq(syncState.userId, userId))
    .get();

  if (!state) return null;

  const rows = db
    .select()
    .from(trade)
    .where(eq(trade.userId, userId))
    .orderBy(asc(trade.closedAt))
    .all();

  const trades = rows.map(toTrade);
  // 테이블은 최신순으로 보여주고, 수익 곡선은 시간순 데이터를 그대로 쓴다.
  const newestFirst = [...trades].reverse();

  return {
    source: "binance",
    syncedAt: new Date(state.syncedAt).toISOString(),
    lookbackDays: state.lookbackDays,
    summary: buildSummary(trades),
    equityCurve: buildEquityCurve(trades),
    trades: newestFirst,
    tagPerformance: buildTagPerformance(trades),
    tradedVolume: state.tradedVolume,
    symbols: JSON.parse(state.symbols) as string[],
    openPositions: state.openPositions,
    notes: JSON.parse(state.notes) as string[],
  };
}

export function deleteUserTrades(userId: string) {
  db.transaction((tx) => {
    tx.delete(trade).where(eq(trade.userId, userId)).run();
    tx.delete(syncState).where(eq(syncState.userId, userId)).run();
  });
}
