import {
  FUTURES_BASE_URL,
  SPOT_BASE_URL,
  signedGet,
  type Credentials,
} from "@/lib/binance/client";
import { SyncError } from "@/lib/binance/errors";
import type { KeyPermissions } from "@/lib/types";

/** userTrades / income 은 한 번에 최대 7일 구간만 조회할 수 있다. */
const MAX_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const PAGE_LIMIT = 1000;
/** 무한 루프 방지용 페이지 상한 (구간별) */
const MAX_PAGES_PER_WINDOW = 20;

export type RawIncome = {
  symbol: string;
  incomeType: string;
  income: string;
  asset: string;
  info: string;
  time: number;
  tranId: number;
  tradeId: string;
};

export type RawUserTrade = {
  buyer: boolean;
  commission: string;
  commissionAsset: string;
  id: number;
  maker: boolean;
  orderId: number;
  price: string;
  qty: string;
  quoteQty: string;
  realizedPnl: string;
  side: "BUY" | "SELL";
  positionSide: "LONG" | "SHORT" | "BOTH";
  symbol: string;
  time: number;
};

type RawApiRestrictions = {
  ipRestrict?: boolean;
  enableReading?: boolean;
  enableWithdrawals?: boolean;
  enableFutures?: boolean;
  enableSpotAndMarginTrading?: boolean;
};

type RawSymbolConfig = {
  symbol: string;
  leverage: number;
};

type RawPositionRisk = {
  symbol: string;
  leverage: string;
};

/**
 * API 키에 부여된 권한을 조회한다.
 *
 * 바이낸스는 '선물 조회 전용' 권한을 따로 제공하지 않는다. 선물 데이터를 읽으려면
 * Enable Futures 를 켜야 하고 이 권한에는 주문 권한이 함께 포함된다.
 * 따라서 서비스가 실제로 강제할 수 있는 최소 안전 조건은 '출금 권한 차단' 이며,
 * 나머지는 권장 사항으로 사용자에게 안내한다.
 */
export async function fetchKeyPermissions(
  credentials: Credentials
): Promise<KeyPermissions> {
  const raw = await signedGet<RawApiRestrictions>(
    SPOT_BASE_URL,
    "/sapi/v1/account/apiRestrictions",
    credentials
  );

  return {
    canRead: raw.enableReading ?? false,
    canTradeFutures: raw.enableFutures ?? false,
    canWithdraw: raw.enableWithdrawals ?? false,
    canTradeSpot: raw.enableSpotAndMarginTrading ?? false,
    ipRestricted: raw.ipRestrict ?? false,
  };
}

/** 조회 기간을 7일 이하 구간으로 쪼갠다. */
function splitWindows(startTime: number, endTime: number) {
  const windows: Array<{ startTime: number; endTime: number }> = [];
  for (let cursor = startTime; cursor < endTime; cursor += MAX_WINDOW_MS) {
    windows.push({
      startTime: cursor,
      endTime: Math.min(cursor + MAX_WINDOW_MS - 1, endTime),
    });
  }
  return windows;
}

/**
 * 손익 흐름(income) 전체를 조회한다. symbol 파라미터가 필요 없으므로
 * 어떤 심볼을 거래했는지 알아내는 진입점으로 사용한다.
 */
export async function fetchIncome(
  credentials: Credentials,
  startTime: number,
  endTime: number
): Promise<RawIncome[]> {
  const collected: RawIncome[] = [];

  for (const window of splitWindows(startTime, endTime)) {
    let cursor = window.startTime;

    for (let page = 0; page < MAX_PAGES_PER_WINDOW; page += 1) {
      const rows = await signedGet<RawIncome[]>(
        FUTURES_BASE_URL,
        "/fapi/v1/income",
        credentials,
        { startTime: cursor, endTime: window.endTime, limit: PAGE_LIMIT }
      );

      collected.push(...rows);
      if (rows.length < PAGE_LIMIT) break;

      const lastTime = rows[rows.length - 1].time;
      if (lastTime >= window.endTime) break;
      cursor = lastTime + 1;
    }
  }

  return collected;
}

/** 특정 심볼의 개별 체결(fill) 내역을 기간 전체에 대해 조회한다. */
export async function fetchUserTrades(
  credentials: Credentials,
  symbol: string,
  startTime: number,
  endTime: number
): Promise<RawUserTrade[]> {
  const collected: RawUserTrade[] = [];

  for (const window of splitWindows(startTime, endTime)) {
    let cursor = window.startTime;

    for (let page = 0; page < MAX_PAGES_PER_WINDOW; page += 1) {
      const rows = await signedGet<RawUserTrade[]>(
        FUTURES_BASE_URL,
        "/fapi/v1/userTrades",
        credentials,
        {
          symbol,
          startTime: cursor,
          endTime: window.endTime,
          limit: PAGE_LIMIT,
        }
      );

      collected.push(...rows);
      if (rows.length < PAGE_LIMIT) break;

      const lastTime = rows[rows.length - 1].time;
      if (lastTime >= window.endTime) break;
      cursor = lastTime + 1;
    }
  }

  return collected;
}

/**
 * 심볼별 레버리지 설정을 조회한다.
 *
 * 체결 내역에는 레버리지가 담기지 않으므로 '현재 설정값'으로 근사한다.
 * 실패해도 동기화 전체를 막지 않고 빈 맵을 반환한다.
 */
export async function fetchLeverageMap(
  credentials: Credentials
): Promise<Map<string, number>> {
  const map = new Map<string, number>();

  try {
    const rows = await signedGet<RawSymbolConfig[]>(
      FUTURES_BASE_URL,
      "/fapi/v1/symbolConfig",
      credentials
    );
    for (const row of rows) {
      if (row.leverage > 0) map.set(row.symbol, row.leverage);
    }
    if (map.size > 0) return map;
  } catch {
    // 구버전 계정에서는 symbolConfig 를 지원하지 않으므로 아래로 폴백한다.
  }

  try {
    const rows = await signedGet<RawPositionRisk[]>(
      FUTURES_BASE_URL,
      "/fapi/v2/positionRisk",
      credentials
    );
    for (const row of rows) {
      const leverage = Number(row.leverage);
      if (Number.isFinite(leverage) && leverage > 0) {
        map.set(row.symbol, leverage);
      }
    }
  } catch {
    // 레버리지 정보를 못 가져오면 호출부에서 1x 로 처리하고 안내 문구를 남긴다.
  }

  return map;
}

/**
 * 바이낸스 분당 요청 한도를 넘기지 않도록 동시 요청 수를 제한한다.
 *
 * 한 심볼이 실패해도 이미 출발한 나머지 요청이 미처리 rejection 으로 남지 않도록
 * allSettled 로 전부 회수한 뒤 첫 번째 오류를 다시 던진다.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  task: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  let failure: unknown = null;

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (cursor < items.length && failure === null) {
        const index = cursor;
        cursor += 1;
        try {
          results[index] = await task(items[index]);
        } catch (error) {
          failure ??= error;
        }
      }
    }
  );

  await Promise.allSettled(workers);
  if (failure !== null) throw failure;

  return results;
}

export { SyncError };
