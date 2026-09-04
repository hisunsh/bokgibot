import { eq } from "drizzle-orm";

import type { Credentials } from "@/lib/binance/client";
import { keyHint, open, seal } from "@/lib/crypto/secret-box";
import { db } from "@/lib/db/client";
import { exchangeCredential } from "@/lib/db/schema";
import type { CredentialStatus, KeyPermissions } from "@/lib/types";

/**
 * 거래소 자격 증명 저장소.
 *
 * 이 모듈만이 평문 키를 다룬다. 바깥으로는 복호화된 값을 필요한 순간에만 넘겨주고,
 * 화면에는 마스킹된 힌트만 노출한다.
 */

/** 봉인해 저장하거나 기존 값을 갱신한다. */
export function saveCredentials(
  userId: string,
  credentials: Credentials,
  permissions: KeyPermissions
) {
  const now = Date.now();
  const row = {
    userId,
    exchange: "binance-futures",
    // userId 를 AAD 로 묶어 다른 사용자 행으로 옮겨 붙이면 복호화가 실패하게 한다.
    sealedApiKey: seal(credentials.apiKey, userId),
    sealedSecretKey: seal(credentials.secretKey, userId),
    apiKeyHint: keyHint(credentials.apiKey),
    permissions: JSON.stringify(permissions),
    createdAt: now,
    updatedAt: now,
  };

  db.insert(exchangeCredential)
    .values(row)
    .onConflictDoUpdate({
      target: exchangeCredential.userId,
      set: {
        sealedApiKey: row.sealedApiKey,
        sealedSecretKey: row.sealedSecretKey,
        apiKeyHint: row.apiKeyHint,
        permissions: row.permissions,
        updatedAt: now,
      },
    })
    .run();
}

/**
 * 저장된 키를 복호화해 돌려준다.
 * 반환값은 호출한 요청 안에서만 쓰고 어디에도 다시 저장하지 않아야 한다.
 */
export function loadCredentials(userId: string): Credentials | null {
  const row = db
    .select()
    .from(exchangeCredential)
    .where(eq(exchangeCredential.userId, userId))
    .get();

  if (!row) return null;

  return {
    apiKey: open(row.sealedApiKey, userId),
    secretKey: open(row.sealedSecretKey, userId),
  };
}

/** 키를 노출하지 않고 연동 상태만 조회한다. 화면 렌더링에 사용. */
export function getCredentialStatus(userId: string): CredentialStatus {
  const row = db
    .select({
      apiKeyHint: exchangeCredential.apiKeyHint,
      permissions: exchangeCredential.permissions,
      createdAt: exchangeCredential.createdAt,
    })
    .from(exchangeCredential)
    .where(eq(exchangeCredential.userId, userId))
    .get();

  if (!row) return { connected: false };

  return {
    connected: true,
    apiKeyHint: row.apiKeyHint,
    registeredAt: new Date(row.createdAt).toISOString(),
    permissions: row.permissions
      ? (JSON.parse(row.permissions) as KeyPermissions)
      : undefined,
  };
}

export function deleteCredentials(userId: string) {
  db.delete(exchangeCredential)
    .where(eq(exchangeCredential.userId, userId))
    .run();
}
