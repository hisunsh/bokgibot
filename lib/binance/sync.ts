import {
  buildEquityCurve,
  buildSummary,
  buildTagPerformance,
} from "@/lib/analytics";
import type { Credentials } from "@/lib/binance/client";
import {
  fetchIncome,
  fetchKeyPermissions,
  fetchLeverageMap,
  fetchUserTrades,
  mapWithConcurrency,
  type RawIncome,
  type RawUserTrade,
} from "@/lib/binance/endpoints";
import { SyncError } from "@/lib/binance/errors";
import { reconstructTrades } from "@/lib/binance/positions";
import type { DashboardSnapshot, KeyPermissions } from "@/lib/types";

const DAY_MS = 24 * 60 * 60 * 1000;
/** 바이낸스는 최근 3개월치 체결 내역만 조회할 수 있다. */
export const MAX_LOOKBACK_DAYS = 90;
export const DEFAULT_LOOKBACK_DAYS = 30;
/** 요청 수를 예측 가능하게 유지하기 위한 심볼 상한 */
const MAX_SYMBOLS = 20;
const SYMBOL_CONCURRENCY = 4;

/**
 * 출금 권한이 열린 키는 무조건 거부한다.
 *
 * 바이낸스에는 '선물 조회 전용' 권한이 없다. 선물 데이터를 읽으려면 Enable Futures 가
 * 필요하고 이 권한에는 주문 권한이 함께 딸려 온다. 그래서 서비스가 기술적으로 강제할 수
 * 있는 최소 안전선은 출금 차단이며, 나머지는 안내로 남긴다.
 */
function assertReadOnly(permissions: KeyPermissions) {
  if (permissions.canWithdraw) {
    throw new SyncError(
      "WITHDRAW_PERMISSION",
      "출금(Withdraw) 권한이 켜져 있는 API 키는 사용할 수 없습니다. 바이낸스에서 출금 권한을 끈 새 키를 발급해 다시 시도해 주세요.",
      403
    );
  }

  if (!permissions.canTradeFutures) {
    throw new SyncError(
      "NO_FUTURES_PERMISSION",
      "이 키에는 선물(Futures) 권한이 없어 선물 체결 내역을 조회할 수 없습니다. 바이낸스 API 관리에서 'Enable Futures' 를 켜 주세요.",
      403
    );
  }

  if (!permissions.canRead) {
    throw new SyncError(
      "INVALID_KEY",
      "이 키에는 조회(Read) 권한이 없습니다.",
      403
    );
  }
}

/** 실현 손익이나 수수료가 발생한 심볼만 추려 userTrades 조회 대상으로 삼는다. */
function pickTradedSymbols(income: RawIncome[]) {
  const weight = new Map<string, number>();

  for (const row of income) {
    if (!row.symbol) continue;
    if (row.incomeType !== "REALIZED_PNL" && row.incomeType !== "COMMISSION") {
      continue;
    }
    const amount = Math.abs(Number(row.income) || 0);
    weight.set(row.symbol, (weight.get(row.symbol) ?? 0) + amount);
  }

  return [...weight.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([symbol]) => symbol);
}

function sumIncome(income: RawIncome[], type: string) {
  return income.reduce(
    (total, row) =>
      row.incomeType === type ? total + (Number(row.income) || 0) : total,
    0
  );
}

/**
 * 자격 증명을 받아 대시보드 스냅샷 하나를 만들어 돌려준다.
 * 자격 증명은 이 호출 스택 안에서만 쓰이고 어디에도 저장되지 않는다.
 */
export async function syncBinanceSnapshot(
  credentials: Credentials,
  lookbackDays: number
): Promise<DashboardSnapshot> {
  const days = Math.min(Math.max(1, Math.trunc(lookbackDays)), MAX_LOOKBACK_DAYS);
  const endTime = Date.now();
  const startTime = endTime - days * DAY_MS;
  const notes: string[] = [];

  const permissions = await fetchKeyPermissions(credentials);
  assertReadOnly(permissions);

  notes.push(
    "바이낸스는 선물 권한을 조회/주문으로 분리하지 않습니다. 복기봇은 조회 엔드포인트만 호출하지만, 키 자체에는 주문 권한이 포함되어 있다는 점을 알고 계세요."
  );
  if (!permissions.ipRestricted) {
    notes.push(
      "이 키에 IP 접근 제한이 없습니다. 바이낸스 API 관리에서 사용할 IP만 허용하도록 설정하는 것을 권장합니다."
    );
  }
  if (permissions.canTradeSpot) {
    notes.push(
      "현물/마진 거래 권한이 켜져 있습니다. 복기에는 필요하지 않으니 끄는 것을 권장합니다."
    );
  }

  const income = await fetchIncome(credentials, startTime, endTime);
  const allSymbols = pickTradedSymbols(income);
  const symbols = allSymbols.slice(0, MAX_SYMBOLS);

  if (allSymbols.length > symbols.length) {
    notes.push(
      `거래한 심볼이 ${allSymbols.length}개라 손익 규모가 큰 상위 ${MAX_SYMBOLS}개만 불러왔습니다.`
    );
  }

  if (symbols.length === 0) {
    return {
      source: "binance",
      syncedAt: new Date().toISOString(),
      lookbackDays: days,
      summary: buildSummary([], endTime),
      equityCurve: [],
      trades: [],
      tagPerformance: [],
      tradedVolume: 0,
      symbols: [],
      openPositions: 0,
      notes: [`최근 ${days}일 동안 청산된 선물 포지션이 없습니다.`, ...notes],
      permissions,
    };
  }

  const leverageMap = await fetchLeverageMap(credentials);
  if (leverageMap.size === 0) {
    notes.push(
      "레버리지 설정을 불러오지 못해 1x 기준으로 손익률을 계산했습니다."
    );
  } else {
    notes.push(
      "체결 내역에는 레버리지가 담기지 않아, 손익률(%)은 현재 심볼별 레버리지 설정을 기준으로 계산한 근사치입니다."
    );
  }

  const fillsBySymbol = await mapWithConcurrency(
    symbols,
    SYMBOL_CONCURRENCY,
    (symbol) => fetchUserTrades(credentials, symbol, startTime, endTime)
  );
  const fills: RawUserTrade[] = fillsBySymbol.flat();

  const reconstruction = reconstructTrades(fills, leverageMap);
  const { trades } = reconstruction;

  if (reconstruction.openPositions > 0) {
    notes.push(
      `아직 청산되지 않은 포지션 ${reconstruction.openPositions}건은 복기 대상에서 제외했습니다.`
    );
  }
  if (reconstruction.orphanExits > 0) {
    notes.push(
      `조회 기간 이전에 진입한 청산 ${reconstruction.orphanExits}건은 진입가를 확인할 수 없어 제외했습니다. (해당 순손익 합계 ${reconstruction.orphanNetPnl.toFixed(
        2
      )} USDT)`
    );
  }
  if (reconstruction.hasNonUsdtFee) {
    notes.push(
      "BNB 등 USDT 가 아닌 자산으로 낸 수수료는 환산 없이 제외했습니다. 실제 수수료는 표시된 값보다 클 수 있습니다."
    );
  }

  const fundingFee = sumIncome(income, "FUNDING_FEE");
  if (Math.abs(fundingFee) >= 0.01) {
    notes.push(
      `기간 내 펀딩비 ${fundingFee.toFixed(
        2
      )} USDT 는 개별 포지션에 배분할 수 없어 손익에 반영하지 않았습니다.`
    );
  }

  return {
    source: "binance",
    syncedAt: new Date().toISOString(),
    lookbackDays: days,
    summary: buildSummary(trades, endTime),
    equityCurve: buildEquityCurve(trades),
    trades,
    tagPerformance: buildTagPerformance(trades),
    tradedVolume: reconstruction.tradedVolume,
    symbols,
    openPositions: reconstruction.openPositions,
    notes,
    permissions,
  };
}
