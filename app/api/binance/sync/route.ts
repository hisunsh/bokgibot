import { z } from "zod";

import { clientIdOf, isRateLimited } from "@/lib/api/rate-limit";
import {
  errorResponse,
  jsonNoStore,
  unknownErrorResponse,
} from "@/lib/api/respond";
import type { Credentials } from "@/lib/binance/client";
import { SyncError } from "@/lib/binance/errors";
import {
  DEFAULT_LOOKBACK_DAYS,
  MAX_LOOKBACK_DAYS,
  syncBinanceSnapshot,
} from "@/lib/binance/sync";
import { requireUserId } from "@/lib/dal";
import { loadCredentials, saveCredentials } from "@/lib/store/credentials";
import { loadSnapshot, persistSnapshot } from "@/lib/store/snapshot";

// HMAC 서명과 SQLite 접근에 node 런타임이 필요하다.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// 90일 × 다수 심볼을 조회하면 수십 초가 걸릴 수 있다.
export const maxDuration = 60;

/** 바이낸스 API 키는 영문+숫자 64자다. 쿼리스트링 조작 가능성을 차단하려고 문자셋을 제한한다. */
const keySchema = z
  .string({ error: "API Key 와 Secret Key 를 모두 입력해 주세요." })
  .transform((value) => value.trim())
  .refine((value) => /^[A-Za-z0-9]{16,256}$/.test(value), {
    message:
      "API 키 형식이 올바르지 않습니다. 바이낸스에서 발급한 키를 그대로 붙여넣어 주세요.",
  });

/**
 * 키를 함께 보내면 검증 후 저장하고, 보내지 않으면 저장된 키로 재조회한다.
 * 덕분에 최초 연동과 이후 새로고침이 같은 엔드포인트를 쓴다.
 */
const bodySchema = z.object({
  apiKey: keySchema.optional(),
  secretKey: keySchema.optional(),
  lookbackDays: z
    .number({ error: "조회 기간이 올바르지 않습니다." })
    .int({ error: "조회 기간은 정수여야 합니다." })
    .min(1, { error: "조회 기간은 최소 1일입니다." })
    .max(MAX_LOOKBACK_DAYS, {
      error: `바이낸스는 최근 ${MAX_LOOKBACK_DAYS}일까지만 체결 내역을 제공합니다.`,
    })
    .optional(),
});

/**
 * 로그인한 사용자의 바이낸스 USDT-M 선물 계정을 조회해 거래 기록을 갱신한다.
 *
 * 자격 증명 처리 원칙:
 * - 평문 키는 이 요청의 호출 스택 안에서만 존재한다.
 * - DB 에는 AES-256-GCM 으로 봉인한 값만 저장하며, 응답에는 절대 포함하지 않는다.
 * - 로그로 남기지 않고, 응답은 no-store 로 내려 중간 캐시에 남지 않게 한다.
 * - 매번 권한을 재확인해 출금 권한이 켜진 키는 즉시 거부한다.
 */
export async function POST(request: Request) {
  try {
    const userId = await requireUserId();

    // 사용자 단위로 제한해 한 계정이 바이낸스 한도를 소진하는 것을 막는다.
    if (isRateLimited(`sync:${userId}`, { windowMs: 5 * 60_000, max: 12 })) {
      return errorResponse(
        "RATE_LIMITED",
        "동기화 요청이 너무 많습니다. 5분 후에 다시 시도해 주세요.",
        429
      );
    }
    if (isRateLimited(`sync-ip:${clientIdOf(request)}`, {
      windowMs: 5 * 60_000,
      max: 30,
    })) {
      return errorResponse(
        "RATE_LIMITED",
        "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
        429
      );
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      rawBody = {};
    }

    const parsed = bodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return errorResponse(
        "INVALID_BODY",
        parsed.error.issues[0]?.message ??
          "API Key 와 Secret Key 를 다시 확인해 주세요.",
        400
      );
    }

    const { apiKey, secretKey, lookbackDays } = parsed.data;
    const hasNewKeys = Boolean(apiKey && secretKey);

    if ((apiKey && !secretKey) || (!apiKey && secretKey)) {
      return errorResponse(
        "INVALID_BODY",
        "API Key 와 Secret Key 를 모두 입력해 주세요.",
        400
      );
    }

    const credentials: Credentials | null = hasNewKeys
      ? { apiKey: apiKey as string, secretKey: secretKey as string }
      : loadCredentials(userId);

    if (!credentials) {
      return errorResponse(
        "NO_CREDENTIALS",
        "등록된 API 키가 없습니다. 먼저 바이낸스 Read-Only 키를 연동해 주세요.",
        400
      );
    }

    // 권한 검증에 실패하면 여기서 예외가 나므로, 잘못된 키는 저장되지 않는다.
    const snapshot = await syncBinanceSnapshot(
      credentials,
      lookbackDays ?? DEFAULT_LOOKBACK_DAYS
    );

    if (hasNewKeys && snapshot.permissions) {
      saveCredentials(userId, credentials, snapshot.permissions);
    }

    persistSnapshot(userId, snapshot);

    // 저장된 전체 기록으로 다시 만들어 돌려준다. 이번 조회 구간뿐 아니라
    // 과거에 쌓아 둔 기록까지 합쳐진 결과를 클라이언트가 받게 된다.
    const merged = loadSnapshot(userId) ?? snapshot;

    return jsonNoStore(
      {
        ok: true as const,
        snapshot: {
          ...merged,
          // 이번 조회에서 확인한 주의사항과 권한을 함께 실어 보낸다.
          notes: snapshot.notes,
          permissions: snapshot.permissions,
        },
      },
      200
    );
  } catch (error) {
    if (error instanceof SyncError) {
      return errorResponse(error.code, error.message, error.status);
    }
    return unknownErrorResponse(error);
  }
}
