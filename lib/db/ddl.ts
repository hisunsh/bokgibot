/**
 * 첫 연결에서 실행되는 스키마 정의.
 *
 * 별도의 마이그레이션 명령 없이 `npm run dev` 만으로 동작하도록 모두 idempotent 하게
 * 작성했다. 모든 문장이 IF NOT EXISTS 이므로 여러 번 실행해도 안전하다.
 */

/**
 * Better Auth 가 요구하는 테이블.
 *
 * 손으로 추측해 쓰지 않고 `getMigrations().compileMigrations()` 가 출력한 SQL 을
 * 그대로 옮긴 뒤 IF NOT EXISTS 만 덧붙였다. Better Auth 를 올릴 때는 같은 방법으로
 * SQL 을 다시 뽑아 이 상수를 갱신해야 한다. (현재 기준: better-auth 1.7.2)
 */
export const AUTH_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS "user" (
  "id" text NOT NULL PRIMARY KEY,
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "emailVerified" integer NOT NULL,
  "image" text,
  "createdAt" date NOT NULL,
  "updatedAt" date NOT NULL,
  "role" text NOT NULL DEFAULT 'user',
  "banned" integer NOT NULL DEFAULT 0,
  "banReason" text,
  "banExpires" date
);

CREATE TABLE IF NOT EXISTS "session" (
  "id" text NOT NULL PRIMARY KEY,
  "expiresAt" date NOT NULL,
  "token" text NOT NULL UNIQUE,
  "createdAt" date NOT NULL,
  "updatedAt" date NOT NULL,
  "ipAddress" text,
  "userAgent" text,
  "impersonatedBy" text,
  "userId" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "account" (
  "id" text NOT NULL PRIMARY KEY,
  "issuer" text NOT NULL,
  "accountId" text NOT NULL,
  "providerId" text NOT NULL,
  "userId" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" date,
  "refreshTokenExpiresAt" date,
  "scope" text,
  "password" text,
  "createdAt" date NOT NULL,
  "updatedAt" date NOT NULL
);

CREATE TABLE IF NOT EXISTS "verification" (
  "id" text NOT NULL PRIMARY KEY,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expiresAt" date NOT NULL,
  "createdAt" date NOT NULL,
  "updatedAt" date NOT NULL
);

CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session" ("userId");
CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account" ("userId");
CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" ("identifier");
CREATE UNIQUE INDEX IF NOT EXISTS "account_issuer_accountId_uidx" ON "account" ("issuer", "accountId");
`;

/** 복기봇 고유 테이블. lib/db/schema.ts 의 Drizzle 정의와 짝을 이룬다. */
export const APP_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS "exchange_credential" (
  "user_id" text NOT NULL PRIMARY KEY REFERENCES "user" ("id") ON DELETE CASCADE,
  "exchange" text NOT NULL DEFAULT 'binance-futures',
  "sealed_api_key" text NOT NULL,
  "sealed_secret_key" text NOT NULL,
  "api_key_hint" text NOT NULL,
  "permissions" text,
  "created_at" integer NOT NULL,
  "updated_at" integer NOT NULL
);

CREATE TABLE IF NOT EXISTS "trade" (
  "id" text NOT NULL,
  "user_id" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "closed_at" integer NOT NULL,
  "symbol" text NOT NULL,
  "side" text NOT NULL,
  "leverage" integer NOT NULL,
  "entry_price" real NOT NULL,
  "exit_price" real NOT NULL,
  "net_pnl" real NOT NULL,
  "pnl_percent" real NOT NULL,
  "fee" real NOT NULL,
  "tags" text NOT NULL DEFAULT '[]',
  "memo" text,
  PRIMARY KEY ("user_id", "id")
);

CREATE INDEX IF NOT EXISTS "trade_user_closed_idx" ON "trade" ("user_id", "closed_at");

CREATE TABLE IF NOT EXISTS "sync_state" (
  "user_id" text NOT NULL PRIMARY KEY REFERENCES "user" ("id") ON DELETE CASCADE,
  "synced_at" integer NOT NULL,
  "lookback_days" integer NOT NULL,
  "traded_volume" real NOT NULL DEFAULT 0,
  "open_positions" integer NOT NULL DEFAULT 0,
  "symbols" text NOT NULL DEFAULT '[]',
  "notes" text NOT NULL DEFAULT '[]'
);
`;
