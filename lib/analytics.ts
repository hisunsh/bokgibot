import type {
  EquityPoint,
  PerformanceSummary,
  TagPerformance,
  Trade,
} from "@/lib/types";

const DAY_MS = 24 * 60 * 60 * 1000;

const KST_DATE_FORMAT = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Seoul",
});

/** ISO 시각을 KST 기준 "YYYY-MM-DD" 로 변환한다. */
function toKstDateKey(iso: string) {
  return KST_DATE_FORMAT.format(new Date(iso));
}

/** "YYYY-MM-DD" -> "MM-DD" (차트 X축 라벨) */
function toChartLabel(dateKey: string) {
  return dateKey.slice(5);
}

function addDays(dateKey: string, days: number) {
  const next = new Date(`${dateKey}T00:00:00Z`).getTime() + days * DAY_MS;
  return new Date(next).toISOString().slice(0, 10);
}

/**
 * 일별 실현 손익을 누적해 수익 곡선을 만든다.
 * 거래가 없는 날에도 점을 채워서 곡선이 끊기지 않게 한다.
 */
export function buildEquityCurve(trades: Trade[]): EquityPoint[] {
  if (trades.length === 0) return [];

  const dailyPnl = new Map<string, number>();
  for (const trade of trades) {
    const key = toKstDateKey(trade.closedAt);
    dailyPnl.set(key, (dailyPnl.get(key) ?? 0) + trade.netPnl);
  }

  const keys = [...dailyPnl.keys()].sort();
  const firstKey = keys[0];
  const lastKey = keys[keys.length - 1];

  const points: EquityPoint[] = [];
  let cumulative = 0;

  for (let key = firstKey; key <= lastKey; key = addDays(key, 1)) {
    const pnl = dailyPnl.get(key) ?? 0;
    cumulative += pnl;
    points.push({
      date: toChartLabel(key),
      dailyPnl: Number(pnl.toFixed(2)),
      cumulativePnl: Number(cumulative.toFixed(2)),
    });
  }

  return points;
}

type Totals = {
  netPnl: number;
  grossProfit: number;
  grossLoss: number;
  wins: number;
  losses: number;
  fees: number;
};

function accumulate(trades: Trade[]): Totals {
  return trades.reduce<Totals>(
    (totals, trade) => {
      totals.netPnl += trade.netPnl;
      totals.fees += trade.fee;
      if (trade.netPnl > 0) {
        totals.grossProfit += trade.netPnl;
        totals.wins += 1;
      } else if (trade.netPnl < 0) {
        totals.grossLoss += Math.abs(trade.netPnl);
        totals.losses += 1;
      }
      return totals;
    },
    { netPnl: 0, grossProfit: 0, grossLoss: 0, wins: 0, losses: 0, fees: 0 }
  );
}

/**
 * 총이익 ÷ 총손실.
 * 손실 거래가 하나도 없으면 무한대이므로 null 을 반환한다.
 * JSON 은 Infinity 를 표현할 수 없어서 API 응답을 거치면 값이 뭉개지기 때문이다.
 */
function profitFactorOf(totals: Totals): number | null {
  if (totals.grossLoss > 0) return totals.grossProfit / totals.grossLoss;
  return totals.grossProfit > 0 ? null : 0;
}

/**
 * KPI 카드에 필요한 지표를 계산한다.
 * `referenceTime` 기준 최근 7일과 그 직전 7일을 비교해 전주 대비 증감을 낸다.
 */
export function buildSummary(
  trades: Trade[],
  referenceTime: number = Date.now()
): PerformanceSummary {
  const totals = accumulate(trades);
  const decided = totals.wins + totals.losses;
  const grossVolume = totals.grossProfit + totals.grossLoss;

  const recentTotals = accumulate(
    trades.filter(
      (trade) => new Date(trade.closedAt).getTime() > referenceTime - 7 * DAY_MS
    )
  );
  const priorTotals = accumulate(
    trades.filter((trade) => {
      const time = new Date(trade.closedAt).getTime();
      return (
        time <= referenceTime - 7 * DAY_MS &&
        time > referenceTime - 14 * DAY_MS
      );
    })
  );

  const netPnlChangePercent =
    priorTotals.netPnl !== 0
      ? ((recentTotals.netPnl - priorTotals.netPnl) /
          Math.abs(priorTotals.netPnl)) *
        100
      : 0;

  // 한쪽이라도 무한대(null)면 증감을 숫자로 표현할 수 없으므로 0 으로 둔다.
  const recentPf = profitFactorOf(recentTotals);
  const priorPf = profitFactorOf(priorTotals);
  const profitFactorChange =
    recentPf !== null && priorPf !== null ? recentPf - priorPf : 0;

  const profitFactor = profitFactorOf(totals);

  return {
    netPnl: Number(totals.netPnl.toFixed(2)),
    netPnlChangePercent: Number(netPnlChangePercent.toFixed(1)),
    winRate: decided > 0 ? Number(((totals.wins / decided) * 100).toFixed(1)) : 0,
    wins: totals.wins,
    losses: totals.losses,
    profitFactor:
      profitFactor === null ? null : Number(profitFactor.toFixed(2)),
    profitFactorChange: Number(profitFactorChange.toFixed(2)),
    totalFees: Number(totals.fees.toFixed(2)),
    feeRatio:
      grossVolume > 0
        ? Number(((totals.fees / grossVolume) * 100).toFixed(1))
        : 0,
  };
}

/** 전략 태그별 손익을 집계해 잘 맞는 전략과 손실 습관을 분리한다. */
export function buildTagPerformance(trades: Trade[]): TagPerformance[] {
  const byTag = new Map<string, { pnl: number; count: number }>();

  for (const trade of trades) {
    for (const tag of trade.tags) {
      const entry = byTag.get(tag) ?? { pnl: 0, count: 0 };
      entry.pnl += trade.netPnl;
      entry.count += 1;
      byTag.set(tag, entry);
    }
  }

  return [...byTag.entries()]
    .map(([tag, { pnl, count }]) => ({
      tag,
      pnl: Number(pnl.toFixed(2)),
      count,
    }))
    .sort((a, b) => b.pnl - a.pnl);
}
