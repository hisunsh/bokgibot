import {
  buildEquityCurve,
  buildSummary,
  buildTagPerformance,
} from "@/lib/analytics";
import type { DashboardSnapshot, ReferralStatus, Trade } from "@/lib/types";

const mockTrades: Trade[] = [
  {
    id: "demo-1",
    closedAt: "2026-09-01T04:12:00.000Z",
    symbol: "BTCUSDT",
    side: "LONG",
    leverage: 8,
    entryPrice: 108420,
    exitPrice: 109880,
    netPnl: 214.4,
    pnlPercent: 6.2,
    fee: 8.1,
    tags: ["#데이트레이딩", "#익절"],
  },
  {
    id: "demo-2",
    closedAt: "2026-09-02T11:40:00.000Z",
    symbol: "ETHUSDT",
    side: "SHORT",
    leverage: 10,
    entryPrice: 4320,
    exitPrice: 4412,
    netPnl: -86.2,
    pnlPercent: -4.1,
    fee: 6.4,
    tags: ["#데이트레이딩", "#손절"],
  },
  {
    id: "demo-3",
    closedAt: "2026-09-04T01:18:00.000Z",
    symbol: "SOLUSDT",
    side: "LONG",
    leverage: 12,
    entryPrice: 198.4,
    exitPrice: 206.1,
    netPnl: 142.8,
    pnlPercent: 8.9,
    fee: 5.2,
    tags: ["#스윙", "#익절"],
  },
];

export const mockSnapshot: DashboardSnapshot = {
  source: "mock",
  syncedAt: "2026-09-04T06:00:00.000Z",
  lookbackDays: 30,
  summary: buildSummary(mockTrades),
  equityCurve: buildEquityCurve(mockTrades),
  trades: mockTrades,
  tagPerformance: buildTagPerformance(mockTrades),
  tradedVolume: 18420,
  symbols: ["BTCUSDT", "ETHUSDT", "SOLUSDT"],
  openPositions: 0,
  notes: ["연동 전 미리보기 데이터입니다."],
};

export const referralStatus: ReferralStatus = {
  currentVolume: 18420,
  requiredVolume: 30000,
  daysLeft: 18,
};
