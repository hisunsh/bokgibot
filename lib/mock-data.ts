import { buildTagPerformance } from "@/lib/analytics";
import type {
  DashboardSnapshot,
  EquityPoint,
  PerformanceSummary,
  ReferralStatus,
  Trade,
} from "@/lib/types";

/**
 * MVP 단계의 더미 데이터.
 * 실제 연동 시 이 모듈만 바이낸스 Read-Only API 응답 어댑터로 교체하면 된다.
 */

export const referralStatus: ReferralStatus = {
  currentVolume: 14_200,
  requiredVolume: 30_000,
  daysLeft: 12,
};

export const performanceSummary: PerformanceSummary = {
  netPnl: 2_480.5,
  netPnlChangePercent: 18.4,
  winRate: 68.2,
  wins: 15,
  losses: 7,
  profitFactor: 2.45,
  profitFactorChange: 0.32,
  totalFees: 182.4,
  feeRatio: 6.9,
};

/** 일별 실현 손익. 누적 곡선은 아래에서 파생시킨다. */
const dailyPnlSeries: Array<{ date: string; dailyPnl: number }> = [
  { date: "08-08", dailyPnl: 128.4 },
  { date: "08-09", dailyPnl: 212.75 },
  { date: "08-10", dailyPnl: -86.2 },
  { date: "08-11", dailyPnl: 164.9 },
  { date: "08-12", dailyPnl: 302.15 },
  { date: "08-13", dailyPnl: -142.6 },
  { date: "08-14", dailyPnl: 58.3 },
  { date: "08-15", dailyPnl: 244.8 },
  { date: "08-16", dailyPnl: -198.45 },
  { date: "08-17", dailyPnl: 96.7 },
  { date: "08-18", dailyPnl: 318.25 },
  { date: "08-19", dailyPnl: -64.9 },
  { date: "08-20", dailyPnl: 182.6 },
  { date: "08-21", dailyPnl: 271.35 },
  { date: "08-22", dailyPnl: -112.8 },
  { date: "08-23", dailyPnl: 42.15 },
  { date: "08-24", dailyPnl: 226.9 },
  { date: "08-25", dailyPnl: -158.35 },
  { date: "08-26", dailyPnl: 134.6 },
  { date: "08-27", dailyPnl: 288.45 },
  { date: "08-28", dailyPnl: -76.2 },
  { date: "08-29", dailyPnl: 198.85 },
  { date: "08-30", dailyPnl: 156.4 },
  { date: "08-31", dailyPnl: -204.55 },
  { date: "09-01", dailyPnl: 312.7 },
  { date: "09-02", dailyPnl: 88.25 },
  { date: "09-03", dailyPnl: -132.9 },
  { date: "09-04", dailyPnl: 246.35 },
];

export const equityCurve: EquityPoint[] = dailyPnlSeries.reduce<EquityPoint[]>(
  (acc, point) => {
    const previous = acc.at(-1)?.cumulativePnl ?? 0;
    acc.push({
      ...point,
      cumulativePnl: Number((previous + point.dailyPnl).toFixed(2)),
    });
    return acc;
  },
  []
);

export const recentTrades: Trade[] = [
  {
    id: "t-1042",
    closedAt: "2026-09-04T21:35:00+09:00",
    symbol: "BTCUSDT",
    side: "LONG",
    leverage: 10,
    entryPrice: 111_240.5,
    exitPrice: 113_580.0,
    netPnl: 486.32,
    pnlPercent: 21.04,
    fee: 14.68,
    tags: ["#웻지돌파", "#눌림목매수"],
    memo: "4시간봉 상승 웻지 돌파 후 리테스트 확인하고 진입. 계획대로 분할 청산.",
  },
  {
    id: "t-1041",
    closedAt: "2026-09-04T14:12:00+09:00",
    symbol: "ETHUSDT",
    side: "SHORT",
    leverage: 15,
    entryPrice: 4_182.35,
    exitPrice: 4_246.8,
    netPnl: -238.9,
    pnlPercent: -23.12,
    fee: 11.24,
    tags: ["#뇌동손절", "#역추세"],
    memo: "상승 추세에서 근거 없이 숏. 손절선도 지키지 못했다.",
  },
  {
    id: "t-1040",
    closedAt: "2026-09-03T23:48:00+09:00",
    symbol: "SOLUSDT",
    side: "LONG",
    leverage: 8,
    entryPrice: 214.62,
    exitPrice: 208.95,
    netPnl: -164.55,
    pnlPercent: -21.14,
    fee: 8.92,
    tags: ["#저점3탭", "#손절준수"],
    memo: "3번째 지지 테스트에서 진입했으나 이탈. 손절은 계획대로 실행.",
  },
  {
    id: "t-1039",
    closedAt: "2026-09-03T11:26:00+09:00",
    symbol: "BTCUSDT",
    side: "SHORT",
    leverage: 12,
    entryPrice: 112_890.0,
    exitPrice: 110_420.5,
    netPnl: 372.18,
    pnlPercent: 26.24,
    fee: 15.36,
    tags: ["#휩쏘반등", "#유동성사냥"],
    memo: "전고점 스윕 후 거래량 감소 확인하고 숏 진입.",
  },
  {
    id: "t-1038",
    closedAt: "2026-09-02T19:03:00+09:00",
    symbol: "XRPUSDT",
    side: "LONG",
    leverage: 20,
    entryPrice: 2.8642,
    exitPrice: 2.9531,
    netPnl: 214.76,
    pnlPercent: 61.02,
    fee: 6.48,
    tags: ["#박스권돌파", "#추세추종"],
    memo: "일봉 박스 상단 돌파. 레버리지가 과했지만 결과는 좋았다.",
  },
  {
    id: "t-1037",
    closedAt: "2026-09-02T08:41:00+09:00",
    symbol: "ETHUSDT",
    side: "LONG",
    leverage: 10,
    entryPrice: 4_096.7,
    exitPrice: 4_158.25,
    netPnl: 148.34,
    pnlPercent: 14.86,
    fee: 10.12,
    tags: ["#저점3탭", "#분할진입"],
    memo: "주요 지지선 3탭 후 반등. 목표가 도달 전 분할 청산.",
  },
  {
    id: "t-1036",
    closedAt: "2026-09-01T22:17:00+09:00",
    symbol: "DOGEUSDT",
    side: "SHORT",
    leverage: 15,
    entryPrice: 0.42186,
    exitPrice: 0.43042,
    netPnl: -96.42,
    pnlPercent: -30.42,
    fee: 5.18,
    tags: ["#뇌동손절", "#물타기"],
    memo: "손실 중 추가 진입으로 손실 확대. 반복하지 말아야 할 패턴.",
  },
  {
    id: "t-1035",
    closedAt: "2026-09-01T13:52:00+09:00",
    symbol: "BTCUSDT",
    side: "LONG",
    leverage: 10,
    entryPrice: 109_845.5,
    exitPrice: 112_310.0,
    netPnl: 512.88,
    pnlPercent: 22.44,
    fee: 14.02,
    tags: ["#웻지돌파", "#손익비3R"],
    memo: "손익비 3R 세팅. 이번 달 최고 트레이드.",
  },
  {
    id: "t-1034",
    closedAt: "2026-08-31T20:29:00+09:00",
    symbol: "SOLUSDT",
    side: "SHORT",
    leverage: 12,
    entryPrice: 221.48,
    exitPrice: 214.06,
    netPnl: 268.94,
    pnlPercent: 40.18,
    fee: 9.34,
    tags: ["#휩쏘반등", "#다이버전스"],
    memo: "RSI 하락 다이버전스 확인 후 숏.",
  },
  {
    id: "t-1033",
    closedAt: "2026-08-31T09:14:00+09:00",
    symbol: "ETHUSDT",
    side: "SHORT",
    leverage: 15,
    entryPrice: 4_268.9,
    exitPrice: 4_312.45,
    netPnl: -186.28,
    pnlPercent: -15.3,
    fee: 11.86,
    tags: ["#역추세", "#손절준수"],
    memo: "역추세 진입 실패. 손절 라인은 지켰다.",
  },
];

/** 전략 태그별 성과 집계. 태그 인사이트 카드에 사용. */
export const tagPerformance = buildTagPerformance(recentTrades);

/**
 * 연동 전에 보여주는 기본 스냅샷.
 * 바이낸스 실데이터와 동일한 `DashboardSnapshot` 규격이라 그대로 교체할 수 있다.
 */
export const mockSnapshot: DashboardSnapshot = {
  source: "mock",
  syncedAt: "2026-09-04T21:35:00+09:00",
  lookbackDays: 28,
  summary: performanceSummary,
  equityCurve,
  trades: recentTrades,
  tagPerformance,
  tradedVolume: referralStatus.currentVolume,
  symbols: [...new Set(recentTrades.map((trade) => trade.symbol))],
  openPositions: 0,
  notes: [],
};
