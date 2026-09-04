import BetterSqlite3 from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import { APP_SCHEMA_SQL, AUTH_SCHEMA_SQL } from "@/lib/db/ddl";
import * as schema from "@/lib/db/schema";

const DB_PATH = process.env.BOKGIBOT_DB_PATH ?? "bokgibot.db";

/**
 * 개발 중 핫 리로드가 모듈을 다시 평가할 때마다 새 SQLite 핸들이 생기면
 * 파일 락이 충돌한다. globalThis 에 하나만 붙여 재사용한다.
 */
const globalForDb = globalThis as unknown as {
  __bokgibotSqlite?: BetterSqlite3.Database;
};

function createConnection() {
  const connection = new BetterSqlite3(DB_PATH);

  // WAL 은 읽기와 쓰기가 서로를 막지 않게 해준다.
  connection.pragma("journal_mode = WAL");
  connection.pragma("foreign_keys = ON");
  // 동시 쓰기가 겹칠 때 즉시 실패하지 않고 잠시 기다린다.
  connection.pragma("busy_timeout = 5000");

  // 별도 마이그레이션 명령 없이 첫 연결에서 스키마를 보장한다.
  connection.exec(AUTH_SCHEMA_SQL);
  connection.exec(APP_SCHEMA_SQL);
  // CREATE TABLE IF NOT EXISTS 는 이미 만들어진 테이블에 새 컬럼을 넣지 않는다.
  ensureColumn(connection, "user", "role", "TEXT NOT NULL DEFAULT 'user'");
  ensureColumn(connection, "user", "banned", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(connection, "user", "banReason", "TEXT");
  ensureColumn(connection, "user", "banExpires", "DATE");
  ensureColumn(connection, "session", "impersonatedBy", "TEXT");

  return connection;
}

function ensureColumn(
  connection: BetterSqlite3.Database,
  table: string,
  column: string,
  definition: string
) {
  const columns = connection.pragma(`table_info(${table})`) as Array<{
    name: string;
  }>;
  if (columns.some((entry) => entry.name === column)) return;
  connection.exec(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${definition}`);
}

export const sqlite = (globalForDb.__bokgibotSqlite ??= createConnection());

export const db = drizzle(sqlite, { schema });
