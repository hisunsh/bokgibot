import { jsonNoStore, unknownErrorResponse } from "@/lib/api/respond";
import { requireUserId } from "@/lib/dal";
import {
  deleteCredentials,
  getCredentialStatus,
} from "@/lib/store/credentials";
import { deleteUserTrades } from "@/lib/store/snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 현재 연동 상태 조회. 키는 포함하지 않고 마스킹된 힌트만 돌려준다. */
export async function GET() {
  try {
    const userId = await requireUserId();
    return jsonNoStore(
      { ok: true as const, status: getCredentialStatus(userId) },
      200
    );
  } catch (error) {
    return unknownErrorResponse(error);
  }
}

/**
 * 연동 해제.
 * `?purgeTrades=true` 를 붙이면 쌓아 둔 거래 기록까지 함께 삭제한다.
 * 기본값은 보존이다. 바이낸스가 3개월치만 제공하므로 실수로 지우면 복구할 수 없다.
 */
export async function DELETE(request: Request) {
  try {
    const userId = await requireUserId();
    const purgeTrades =
      new URL(request.url).searchParams.get("purgeTrades") === "true";

    deleteCredentials(userId);
    if (purgeTrades) deleteUserTrades(userId);

    return jsonNoStore(
      { ok: true as const, purgedTrades: purgeTrades },
      200
    );
  } catch (error) {
    return unknownErrorResponse(error);
  }
}
