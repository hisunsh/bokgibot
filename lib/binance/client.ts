import { createHmac } from "node:crypto";

import { SyncError, fromBinanceError } from "@/lib/binance/errors";

export const FUTURES_BASE_URL = "https://fapi.binance.com";
export const SPOT_BASE_URL = "https://api.binance.com";

const REQUEST_TIMEOUT_MS = 15_000;
const RECV_WINDOW_MS = 10_000;

/**
 * 요청 1건 동안만 유효한 자격 증명.
 * 어디에도 저장하지 않고 호출 스택 안에서만 전달된다.
 */
export type Credentials = {
  apiKey: string;
  secretKey: string;
};

type QueryValue = string | number | undefined;

/**
 * 바이낸스 서명 규칙:
 * 정렬하지 않은 쿼리스트링 원문을 그대로 secretKey 로 HMAC SHA256 한 hex 값을
 * signature 파라미터로 마지막에 덧붙인다. 순서가 달라지면 서명이 깨지므로
 * URLSearchParams 로 만든 문자열을 그대로 서명 대상으로 사용한다.
 */
function sign(query: string, secretKey: string) {
  return createHmac("sha256", secretKey).update(query).digest("hex");
}

function buildQuery(params: Record<string, QueryValue>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  return search;
}

/**
 * 서버 시계가 조금 틀어져 있어도 -1021 이 나지 않도록 바이낸스 서버 시간과의
 * 오프셋을 한 번 측정해 재사용한다. 프로세스 수명 동안만 유지되는 캐시다.
 */
let timeOffsetMs: number | null = null;

async function getTimeOffset(): Promise<number> {
  if (timeOffsetMs !== null) return timeOffsetMs;

  try {
    const response = await fetch(`${FUTURES_BASE_URL}/fapi/v1/time`, {
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error("time endpoint unavailable");

    const body = (await response.json()) as { serverTime: number };
    timeOffsetMs = body.serverTime - Date.now();
  } catch {
    // 시간 동기화에 실패하면 로컬 시간을 그대로 쓴다. recvWindow 안이면 문제없다.
    timeOffsetMs = 0;
  }

  return timeOffsetMs;
}

/** 바이낸스가 반환하는 오류 본문 */
type BinanceErrorBody = { code: number; msg: string };

function isBinanceErrorBody(value: unknown): value is BinanceErrorBody {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as BinanceErrorBody).code === "number"
  );
}

/**
 * 서명이 필요한 GET 요청을 수행한다.
 *
 * 보안 주의사항:
 * - apiKey 는 헤더로만, secretKey 는 서명 계산에만 쓰이며 절대 전송되지 않는다.
 * - 실패 시에도 자격 증명이 오류 메시지나 로그에 섞이지 않도록 코드/메시지만 다룬다.
 */
export async function signedGet<T>(
  baseUrl: string,
  path: string,
  credentials: Credentials,
  params: Record<string, QueryValue> = {}
): Promise<T> {
  const offset = await getTimeOffset();
  const search = buildQuery({
    ...params,
    recvWindow: RECV_WINDOW_MS,
    timestamp: Date.now() + offset,
  });
  search.set("signature", sign(search.toString(), credentials.secretKey));

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}?${search.toString()}`, {
      method: "GET",
      headers: {
        "X-MBX-APIKEY": credentials.apiKey,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new SyncError(
      "NETWORK_ERROR",
      "바이낸스 서버에 연결할 수 없습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.",
      504
    );
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (isBinanceErrorBody(payload)) {
      throw fromBinanceError(payload.code, payload.msg);
    }
    if (response.status === 429 || response.status === 418) {
      throw new SyncError(
        "RATE_LIMITED",
        "바이낸스 요청 한도를 초과했습니다. 1분 후 다시 시도해 주세요.",
        429
      );
    }
    throw new SyncError(
      "UPSTREAM_ERROR",
      `바이낸스 응답 오류입니다. (HTTP ${response.status})`,
      502
    );
  }

  return payload as T;
}
