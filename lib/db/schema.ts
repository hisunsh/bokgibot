import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

/**
 * Better Auth 가 관리하는 user/session/account/verification 테이블은 이 파일에서
 * 다시 정의하지 않는다. 여기 있는 것은 복기봇 고유의 애플리케이션 테이블뿐이다.
 */

/**
 * 사용자당 하나의 거래소 자격 증명.
 * 평문은 절대 들어오지 않고, AES-256-GCM 으로 봉인된 문자열만 저장한다.
 */
export const exchangeCredential = sqliteTable("exchange_credential", {
  userId: text("user_id").primaryKey(),
  exchange: text("exchange").notNull().default("binance-futures"),
  sealedApiKey: text("sealed_api_key").notNull(),
  sealedSecretKey: text("sealed_secret_key").notNull(),
  /** 어떤 키를 등록했는지 사용자가 알아볼 수 있게 하는 마스킹된 힌트 */
  apiKeyHint: text("api_key_hint").notNull(),
  /** 마지막 검증 시점의 권한 스냅샷 (JSON) */
  permissions: text("permissions"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

/**
 * 청산 완료된 포지션.
 *
 * (user_id, id) 복합 PK 라서 겹치는 기간을 다시 동기화해도 중복이 생기지 않고
 * upsert 로 덮어써진다. 바이낸스가 3개월치만 제공하므로, 여기 쌓인 기록이
 * 그 이후의 장기 복기를 가능하게 하는 유일한 원본이 된다.
 */
export const trade = sqliteTable(
  "trade",
  {
    /** 바이낸스 체결에서 유도한 안정적인 식별자. 예: BTCUSDT-698759 */
    id: text("id").notNull(),
    userId: text("user_id").notNull(),
    /** epoch milliseconds */
    closedAt: integer("closed_at").notNull(),
    symbol: text("symbol").notNull(),
    side: text("side").notNull(),
    leverage: integer("leverage").notNull(),
    entryPrice: real("entry_price").notNull(),
    exitPrice: real("exit_price").notNull(),
    netPnl: real("net_pnl").notNull(),
    pnlPercent: real("pnl_percent").notNull(),
    fee: real("fee").notNull(),
    /** JSON 문자열로 저장된 태그 배열 */
    tags: text("tags").notNull().default(sql`'[]'`),
    memo: text("memo"),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.id] }),
    index("trade_user_closed_idx").on(table.userId, table.closedAt),
  ]
);

/** 마지막 동기화의 메타데이터. 거래 자체가 아니라 조회 상태를 기록한다. */
export const syncState = sqliteTable("sync_state", {
  userId: text("user_id").primaryKey(),
  syncedAt: integer("synced_at").notNull(),
  lookbackDays: integer("lookback_days").notNull(),
  tradedVolume: real("traded_volume").notNull().default(0),
  openPositions: integer("open_positions").notNull().default(0),
  /** JSON 문자열 */
  symbols: text("symbols").notNull().default(sql`'[]'`),
  /** JSON 문자열 */
  notes: text("notes").notNull().default(sql`'[]'`),
});

export type TradeRow = typeof trade.$inferSelect;
export type ExchangeCredentialRow = typeof exchangeCredential.$inferSelect;
export type SyncStateRow = typeof syncState.$inferSelect;
