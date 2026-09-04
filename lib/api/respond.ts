import { NextResponse } from "next/server";

import { SyncError } from "@/lib/binance/errors";
import type { SyncErrorCode } from "@/lib/types";

/**
 * 자격 증명이 오갈 수 있는 응답은 어떤 계층에도 캐시되지 않아야 한다.
 */
export function jsonNoStore<T>(body: T, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      "Referrer-Policy": "no-referrer",
    },
  });
}

export function errorResponse(
  code: SyncErrorCode,
  message: string,
  status: number
) {
  return jsonNoStore({ ok: false as const, error: { code, message } }, status);
}

/**
 * 예상하지 못한 예외의 상세 내용은 스택에 자격 증명이 섞일 수 있으므로 밖으로 내보내지 않는다.
 * 우리가 의도적으로 던진 SyncError 만 그대로 전달한다.
 */
export function unknownErrorResponse(error: unknown) {
  if (error instanceof SyncError) {
    return errorResponse(error.code, error.message, error.status);
  }

  return errorResponse(
    "UPSTREAM_ERROR",
    "처리 중 알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    500
  );
}
