import type { CredentialStatus, SyncResponse } from "@/lib/types";

export type SyncRequest = {
  /** 최초 연동 시에만 보낸다. 이후에는 서버에 저장된 키를 사용한다. */
  apiKey?: string;
  secretKey?: string;
  lookbackDays: number;
};

const NETWORK_ERROR: SyncResponse = {
  ok: false,
  error: {
    code: "NETWORK_ERROR",
    message:
      "서버에 연결할 수 없습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.",
  },
};

/**
 * `/api/binance/sync` 호출을 감싼 헬퍼.
 *
 * 자격 증명은 최초 연동 요청의 본문으로만 전달되며 브라우저 저장소(localStorage,
 * 쿠키 등)에는 절대 기록하지 않는다. 이후 재조회는 서버에 봉인 저장된 키를 쓰므로
 * 클라이언트가 키를 들고 있을 필요가 없다.
 */
export async function requestSync(body: SyncRequest): Promise<SyncResponse> {
  let response: Response;

  try {
    response = await fetch("/api/binance/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return NETWORK_ERROR;
  }

  const payload: unknown = await response.json().catch(() => null);

  if (payload && typeof payload === "object" && "ok" in payload) {
    return payload as SyncResponse;
  }

  return {
    ok: false,
    error: {
      code: "UPSTREAM_ERROR",
      message: `예상하지 못한 서버 응답입니다. (HTTP ${response.status})`,
    },
  };
}

export type DisconnectResult =
  | { ok: true; purgedTrades: boolean }
  | { ok: false; message: string };

/** 저장된 키를 삭제한다. purgeTrades 를 켜면 쌓인 거래 기록까지 지운다. */
export async function requestDisconnect(
  purgeTrades: boolean
): Promise<DisconnectResult> {
  try {
    const response = await fetch(
      `/api/binance/credentials?purgeTrades=${purgeTrades}`,
      { method: "DELETE", cache: "no-store" }
    );
    const payload = (await response.json().catch(() => null)) as
      | { ok: true; purgedTrades: boolean }
      | { ok: false; error: { message: string } }
      | null;

    if (payload?.ok) {
      return { ok: true, purgedTrades: payload.purgedTrades };
    }

    return {
      ok: false,
      message:
        payload && "error" in payload
          ? payload.error.message
          : "연동 해제에 실패했습니다.",
    };
  } catch {
    return { ok: false, message: "서버에 연결할 수 없습니다." };
  }
}

export type CredentialStatusResult = CredentialStatus | null;
