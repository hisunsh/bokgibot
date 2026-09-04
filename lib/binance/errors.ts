import type { SyncErrorCode } from "@/lib/types";

/** 클라이언트에 그대로 노출해도 안전한(키가 섞이지 않은) 동기화 오류 */
export class SyncError extends Error {
  readonly code: SyncErrorCode;
  readonly status: number;

  constructor(code: SyncErrorCode, message: string, status = 400) {
    super(message);
    this.name = "SyncError";
    this.code = code;
    this.status = status;
  }
}

/** 바이낸스 오류 코드를 사용자가 바로 조치할 수 있는 한국어 안내로 변환한다. */
export function fromBinanceError(
  binanceCode: number,
  binanceMessage: string
): SyncError {
  switch (binanceCode) {
    case -2014:
    case -2008:
      return new SyncError(
        "INVALID_KEY",
        "바이낸스가 이 API Key 를 인식하지 못했습니다. 키를 다시 복사했는지, 공백이나 줄바꿈이 섞이지 않았는지 확인해 주세요.",
        401
      );
    case -2015:
      return new SyncError(
        "IP_RESTRICTED",
        "키가 거부되었습니다. 바이낸스 API 관리에서 이 키의 IP 제한 목록에 현재 서버 IP를 추가했는지, 그리고 '선물' 권한이 켜져 있는지 확인해 주세요.",
        403
      );
    case -1022:
      return new SyncError(
        "INVALID_KEY",
        "서명 검증에 실패했습니다. Secret Key를 다시 확인해 주세요.",
        401
      );
    case -1021:
      return new SyncError(
        "UPSTREAM_ERROR",
        "서버 시간과 바이낸스 시간의 차이가 너무 큽니다. 잠시 후 다시 시도해 주세요.",
        503
      );
    case -1003:
    case -1015:
      return new SyncError(
        "RATE_LIMITED",
        "바이낸스 요청 한도를 초과했습니다. 1분 후 다시 시도해 주세요.",
        429
      );
    case -1099:
      return new SyncError(
        "INVALID_KEY",
        "인증에 실패했습니다. API Key와 Secret Key가 같은 키 쌍인지 확인해 주세요.",
        401
      );
    default:
      return new SyncError(
        "UPSTREAM_ERROR",
        `바이낸스 응답 오류입니다. (${binanceCode}: ${binanceMessage})`,
        502
      );
  }
}
