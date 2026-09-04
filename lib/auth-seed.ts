import { randomUUID } from "node:crypto";

import { auth } from "@/lib/auth";
import { SUPER_ROLE } from "@/lib/auth-roles";
import { sqlite } from "@/lib/db/client";

const DEFAULT_SUPER_EMAIL = "admin@bokgibot.local";
const DEFAULT_SUPER_NAME = "슈퍼관리자";
/** 로컬 개발용 초기 비밀번호. 프로덕션에서는 SUPER_ADMIN_PASSWORD 가 필수다. */
const DEFAULT_SUPER_PASSWORD = "SuperBokgi!2026";
const CREDENTIAL_ISSUER = "local:credential";

function superCredentials() {
  const email = (
    process.env.SUPER_ADMIN_EMAIL ?? DEFAULT_SUPER_EMAIL
  ).trim().toLowerCase();
  const password =
    process.env.SUPER_ADMIN_PASSWORD ??
    (process.env.NODE_ENV === "production" ? "" : DEFAULT_SUPER_PASSWORD);
  const name = (process.env.SUPER_ADMIN_NAME ?? DEFAULT_SUPER_NAME).trim();

  return { email, password, name };
}

async function hashWithAuth(password: string) {
  const ctx = await auth.$context;
  return ctx.password.hash(password);
}

/**
 * 슈퍼 계정이 없으면 만들고, 이미 있으면 역할과 credential 계정 형태를 맞춘다.
 * 비밀번호는 새로 만들 때만 넣고, 이미 있는 계정의 비밀번호는 덮어쓰지 않는다.
 */
export async function ensureSuperAdmin() {
  const { email, password, name } = superCredentials();
  if (!email || !password) return;

  const existing = sqlite
    .prepare(`SELECT id, role FROM "user" WHERE email = ?`)
    .get(email) as { id: string; role: string | null } | undefined;

  if (existing) {
    if (existing.role !== SUPER_ROLE) {
      sqlite
        .prepare(`UPDATE "user" SET role = ?, updatedAt = ? WHERE id = ?`)
        .run(SUPER_ROLE, new Date().toISOString(), existing.id);
    }

    const account = sqlite
      .prepare(`SELECT id, issuer FROM "account" WHERE userId = ?`)
      .get(existing.id) as { id: string; issuer: string } | undefined;

    if (account && account.issuer !== CREDENTIAL_ISSUER) {
      // 초기 시드가 issuer 를 잘못 넣어 로그인이 거절되던 계정을 고친다.
      const hashed = await hashWithAuth(password);
      sqlite
        .prepare(
          `UPDATE "account" SET issuer = ?, password = ?, updatedAt = ? WHERE id = ?`
        )
        .run(CREDENTIAL_ISSUER, hashed, new Date().toISOString(), account.id);
    }
    return;
  }

  const anySuper = sqlite
    .prepare(`SELECT id FROM "user" WHERE role = ? LIMIT 1`)
    .get(SUPER_ROLE) as { id: string } | undefined;
  if (anySuper) return;

  const now = new Date().toISOString();
  const userId = randomUUID();
  const hashed = await hashWithAuth(password);

  const insert = sqlite.transaction(() => {
    sqlite
      .prepare(
        `INSERT INTO "user" (id, name, email, emailVerified, createdAt, updatedAt, role, banned)
         VALUES (?, ?, ?, 1, ?, ?, ?, 0)`
      )
      .run(userId, name, email, now, now, SUPER_ROLE);

    sqlite
      .prepare(
        `INSERT INTO "account" (
           id, issuer, accountId, providerId, userId, password, createdAt, updatedAt
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        randomUUID(),
        CREDENTIAL_ISSUER,
        userId,
        "credential",
        userId,
        hashed,
        now,
        now
      );
  });

  insert();
}

let seeding: Promise<void> | null = null;

/** 한 프로세스에서 시드는 한 번만 돈다. */
export function seedSuperAdminOnce() {
  seeding ??= ensureSuperAdmin().catch((error) => {
    seeding = null;
    console.error("[bokgibot] 슈퍼 계정 시드에 실패했습니다.", error);
  });
  return seeding;
}
