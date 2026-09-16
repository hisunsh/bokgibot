import { statSync } from "node:fs";

import { SUPER_ROLE, USER_ROLE } from "@/lib/auth-roles";
import { sqlite } from "@/lib/db/client";

const PAGE_SIZE = 40;

export type ColumnKind = "text" | "flag" | "number" | "timeMs" | "iso";

type SqliteColumn = {
  name: string;
  type: string;
  pk: number;
};

const TABLE_LABELS: Record<string, string> = {
  user: "계정",
  session: "세션",
  account: "로그인 수단",
  verification: "인증 대기",
  exchange_credential: "API 연동",
  trade: "매매",
  sync_state: "동기화",
  subscription: "구독",
  balance_snapshot: "잔고 스냅샷",
  app_meta: "앱 설정",
};

const SECRET_COLUMNS = new Set([
  "password",
  "token",
  "value",
  "sealed_api_key",
  "sealed_secret_key",
  "accesstoken",
  "refreshtoken",
  "idtoken",
  "billing_key",
  "billingkey",
  "customer_key",
  "customerkey",
]);

export type AdminTableSummary = {
  name: string;
  label: string;
  rows: number;
};

export type AdminColumnInfo = {
  name: string;
  kind: ColumnKind;
  editable: boolean;
};

export type AdminTablePage = {
  name: string;
  label: string;
  pk: string[];
  columns: AdminColumnInfo[];
  rows: Array<{
    pk: Record<string, string>;
    cells: Array<{ name: string; display: string; raw: string }>;
  }>;
  total: number;
  offset: number;
  pageSize: number;
};

type TableMeta = {
  name: string;
  label: string;
  pk: string[];
  columns: Array<{ name: string; kind: ColumnKind; editable: boolean }>;
  search: string[];
  orderBy: string;
  touch: { name: string; kind: "iso" | "timeMs" } | null;
};

function isSecretColumn(name: string) {
  const lower = name.toLowerCase();
  if (SECRET_COLUMNS.has(lower)) return true;
  if (lower.startsWith("sealed_")) return true;
  if (lower.includes("secret")) return true;
  return false;
}

function quoteIdent(name: string) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error("허용되지 않은 식별자입니다.");
  }
  return `"${name}"`;
}

function kindOf(column: SqliteColumn): ColumnKind {
  const name = column.name;
  const type = column.type.toUpperCase();
  if (
    /^(banned|emailVerified|email_verified|cancel_at_period_end)$/i.test(name)
  ) {
    return "flag";
  }
  if (/^(createdAt|updatedAt|expiresAt|banExpires)$/.test(name)) return "iso";
  if (/_at$/.test(name) && (type.includes("INT") || type === "")) return "timeMs";
  if (type.includes("REAL") || type.includes("FLOA") || type.includes("DOUB")) {
    return "number";
  }
  if (type.includes("INT") && !type.includes("DATE")) return "number";
  return "text";
}

function rawColumns(table: string): SqliteColumn[] {
  return sqlite.pragma(`table_info(${quoteIdent(table)})`) as SqliteColumn[];
}

function catalogOf(table: string): TableMeta {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table)) {
    throw new Error("없는 테이블입니다.");
  }
  const exists = sqlite
    .prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1`
    )
    .get(table) as { name: string } | undefined;
  if (!exists) throw new Error("없는 테이블입니다.");

  const all = rawColumns(table);
  const visible = all.filter((column) => !isSecretColumn(column.name));
  if (visible.length === 0) throw new Error("볼 수 있는 칸이 없습니다.");

  const pk = all
    .filter((column) => column.pk > 0)
    .sort((left, right) => left.pk - right.pk)
    .map((column) => column.name);
  const safePk = pk.length > 0 ? pk : [visible[0].name];

  const columns = visible.map((column) => {
    const kind = kindOf(column);
    const isPk = safePk.includes(column.name);
    return { name: column.name, kind, editable: !isPk };
  });

  const search = columns
    .filter((column) => column.kind === "text")
    .map((column) => column.name);

  const orderCandidates = [
    "createdAt",
    "created_at",
    "closed_at",
    "updatedAt",
    "updated_at",
    "synced_at",
    "day",
    "key",
  ];
  const orderName =
    orderCandidates.find((name) =>
      columns.some((column) => column.name === name)
    ) ?? safePk[0];
  const orderCol = columns.find((column) => column.name === orderName);
  const orderBy =
    orderName === "key"
      ? `${quoteIdent(orderName)} ASC`
      : `${quoteIdent(orderName)} ${orderCol?.kind === "text" && orderName === "day" ? "DESC" : "DESC"}`;

  const touchName = columns.find(
    (column) => column.name === "updatedAt" || column.name === "updated_at"
  );

  return {
    name: table,
    label: TABLE_LABELS[table] ?? table,
    pk: safePk,
    columns,
    search,
    orderBy,
    touch: touchName
      ? { name: touchName.name, kind: touchName.kind === "timeMs" ? "timeMs" : "iso" }
      : null,
  };
}

function formatCell(kind: ColumnKind, value: unknown) {
  if (value === null || value === undefined) return "";
  if (kind === "flag") return Number(value) === 1 ? "예" : "아니오";
  if (kind === "timeMs") {
    const ms = Number(value);
    if (!Number.isFinite(ms) || ms <= 0) return "";
    return new Date(ms).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  }
  if (kind === "iso") {
    const raw = String(value);
    const time = new Date(raw).getTime();
    if (!Number.isFinite(time)) return raw;
    return new Date(time).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  }
  const text = String(value);
  return text.length > 240 ? `${text.slice(0, 240)}…` : text;
}

function rawCell(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function pkClause(pk: string[], values: Record<string, string>) {
  const missing = pk.find((column) => !values[column]?.trim());
  if (missing) throw new Error("행을 찾을 수 없습니다.");
  return {
    sql: pk.map((column) => `${quoteIdent(column)} = ?`).join(" AND "),
    params: pk.map((column) => values[column].trim()),
  };
}

function activeAdminCount(exceptUserId?: string) {
  const row = sqlite
    .prepare(
      `SELECT COUNT(*) AS c FROM "user"
       WHERE role = ? AND COALESCE(banned, 0) = 0 AND id != ?`
    )
    .get(SUPER_ROLE, exceptUserId ?? "") as { c: number };
  return Number(row.c);
}

function readUserRow(id: string) {
  return sqlite
    .prepare(`SELECT id, role, banned FROM "user" WHERE id = ? LIMIT 1`)
    .get(id) as { id: string; role: string; banned: number } | undefined;
}

function parseValue(kind: ColumnKind, raw: unknown) {
  if (raw === null) return null;
  const text = String(raw).trim();
  if (text.length === 0) return null;

  if (kind === "flag") {
    const lower = text.toLowerCase();
    if (["1", "true", "yes", "예"].includes(lower)) return 1;
    if (["0", "false", "no", "아니오"].includes(lower)) return 0;
    throw new Error("예/아니오 값만 넣을 수 있습니다.");
  }
  if (kind === "number" || kind === "timeMs") {
    if (kind === "timeMs" && !/^\d+$/.test(text)) {
      const value = new Date(text).getTime();
      if (!Number.isFinite(value)) throw new Error("시각 형식이 올바르지 않습니다.");
      return value;
    }
    const value = Number(text.replaceAll(",", ""));
    if (!Number.isFinite(value)) throw new Error("숫자 형식이 올바르지 않습니다.");
    return value;
  }
  return text;
}

export function listAdminTables(): {
  tables: AdminTableSummary[];
  dbPath: string;
  dbBytes: number | null;
} {
  const names = sqlite
    .prepare(
      `SELECT name FROM sqlite_master
       WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
       ORDER BY name`
    )
    .all() as Array<{ name: string }>;

  const tables = names
    .filter((row) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(row.name))
    .map((row) => {
      const count = sqlite
        .prepare(`SELECT COUNT(*) AS c FROM ${quoteIdent(row.name)}`)
        .get() as { c: number };
      return {
        name: row.name,
        label: TABLE_LABELS[row.name] ?? row.name,
        rows: Number(count.c),
      };
    });

  const dbPath = process.env.BOKGIBOT_DB_PATH ?? "bokgibot.db";
  let dbBytes: number | null = null;
  try {
    dbBytes = statSync(/* turbopackIgnore: true */ dbPath).size;
  } catch {
    dbBytes = null;
  }

  return { tables, dbPath, dbBytes };
}

export function readAdminTable(input: {
  table: string;
  offset?: number;
  q?: string;
}): AdminTablePage {
  const catalog = catalogOf(input.table);
  const offset = Math.max(0, Math.floor(input.offset ?? 0));
  const quotedTable = quoteIdent(catalog.name);
  const columnSql = catalog.columns.map((column) => quoteIdent(column.name)).join(", ");
  const query = input.q?.trim() ?? "";

  const params: string[] = [];
  let whereSql = "";
  if (query && catalog.search.length > 0) {
    const like = `%${query.replaceAll("%", "").replaceAll("_", "")}%`;
    whereSql = `WHERE ${catalog.search
      .map((column) => `${quoteIdent(column)} LIKE ?`)
      .join(" OR ")}`;
    params.push(...catalog.search.map(() => like));
  }

  const total = sqlite
    .prepare(`SELECT COUNT(*) AS c FROM ${quotedTable} ${whereSql}`)
    .get(...params) as { c: number };

  const rawRows = sqlite
    .prepare(
      `SELECT ${columnSql} FROM ${quotedTable} ${whereSql} ORDER BY ${catalog.orderBy} LIMIT ? OFFSET ?`
    )
    .all(...params, PAGE_SIZE, offset) as Array<Record<string, unknown>>;

  return {
    name: catalog.name,
    label: catalog.label,
    pk: [...catalog.pk],
    columns: catalog.columns.map((column) => ({
      name: column.name,
      kind: column.kind,
      editable: column.editable,
    })),
    rows: rawRows.map((row) => ({
      pk: Object.fromEntries(
        catalog.pk.map((column) => [column, rawCell(row[column])])
      ),
      cells: catalog.columns.map((column) => ({
        name: column.name,
        display: formatCell(column.kind, row[column.name]),
        raw: rawCell(row[column.name]),
      })),
    })),
    total: Number(total.c),
    offset,
    pageSize: PAGE_SIZE,
  };
}

export function updateAdminRow(input: {
  table: string;
  pk: Record<string, string>;
  patch: Record<string, unknown>;
}) {
  const catalog = catalogOf(input.table);
  const where = pkClause(catalog.pk, input.pk);
  const editable = new Set(
    catalog.columns.filter((column) => column.editable).map((column) => column.name)
  );

  const parsed: Record<string, unknown> = {};
  for (const [column, raw] of Object.entries(input.patch)) {
    if (!editable.has(column) || isSecretColumn(column)) {
      throw new Error(`'${column}' 칸은 수정할 수 없습니다.`);
    }
    const def = catalog.columns.find((item) => item.name === column);
    if (!def) throw new Error("없는 칸입니다.");
    let next = parseValue(def.kind, raw);

    if (catalog.name === "user" && column === "email") {
      const email = String(next ?? "")
        .trim()
        .toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("이메일 형식이 올바르지 않습니다.");
      }
      const taken = sqlite
        .prepare(`SELECT id FROM "user" WHERE lower(email) = ? AND id != ? LIMIT 1`)
        .get(email, input.pk.id) as { id: string } | undefined;
      if (taken) throw new Error("이미 가입된 이메일입니다.");
      next = email;
    }

    if (catalog.name === "user" && column === "role") {
      if (next !== USER_ROLE && next !== SUPER_ROLE) {
        throw new Error("역할은 user 또는 admin 만 가능합니다.");
      }
    }

    if (catalog.name === "trade" && column === "side") {
      const side = String(next ?? "").toUpperCase();
      if (side !== "LONG" && side !== "SHORT") {
        throw new Error("방향은 LONG 또는 SHORT 만 가능합니다.");
      }
      next = side;
    }

    parsed[column] = next;
  }

  const columns = Object.keys(parsed);
  if (columns.length === 0) throw new Error("바꿀 값이 없습니다.");

  if (catalog.name === "user") {
    const current = readUserRow(input.pk.id);
    if (!current) throw new Error("행을 찾을 수 없습니다.");
    const nextRole = ("role" in parsed ? parsed.role : current.role) as string;
    const nextBanned = Number(
      "banned" in parsed ? parsed.banned : current.banned
    );
    const stillAdmin = nextRole === SUPER_ROLE && nextBanned !== 1;
    if (current.role === SUPER_ROLE && !stillAdmin && activeAdminCount(current.id) < 1) {
      throw new Error("마지막 슈퍼 계정은 권한을 내릴 수 없습니다.");
    }
  }

  const assignments = columns.map((column) => `${quoteIdent(column)} = ?`);
  const values = columns.map((column) => parsed[column]);
  if (catalog.touch && !parsed[catalog.touch.name]) {
    assignments.push(`${quoteIdent(catalog.touch.name)} = ?`);
    values.push(
      catalog.touch.kind === "timeMs" ? Date.now() : new Date().toISOString()
    );
  }

  const result = sqlite
    .prepare(
      `UPDATE ${quoteIdent(catalog.name)} SET ${assignments.join(", ")} WHERE ${where.sql}`
    )
    .run(...values, ...where.params);
  if (result.changes === 0) throw new Error("행을 찾을 수 없습니다.");
}

export function deleteAdminRow(input: {
  table: string;
  pk: Record<string, string>;
  actorId: string;
}) {
  const catalog = catalogOf(input.table);
  const where = pkClause(catalog.pk, input.pk);

  sqlite.transaction(() => {
    if (catalog.name === "user") {
      if (input.pk.id === input.actorId) {
        throw new Error("자기 계정은 삭제할 수 없습니다.");
      }
      const current = readUserRow(input.pk.id);
      if (!current) throw new Error("행을 찾을 수 없습니다.");
      if (current.role === SUPER_ROLE && activeAdminCount(current.id) < 1) {
        throw new Error("마지막 슈퍼 계정은 삭제할 수 없습니다.");
      }
    }

    const result = sqlite
      .prepare(`DELETE FROM ${quoteIdent(catalog.name)} WHERE ${where.sql}`)
      .run(...where.params);
    if (result.changes === 0) throw new Error("행을 찾을 수 없습니다.");
  })();
}
