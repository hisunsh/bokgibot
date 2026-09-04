import { sqlite } from "@/lib/db/client";
import type { UserRole } from "@/lib/auth-roles";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  connected: boolean;
  tradeCount: number;
};

export function listUsersForAdmin(): AdminUserRow[] {
  const rows = sqlite
    .prepare(
      `SELECT
         u.id,
         u.name,
         u.email,
         COALESCE(u.role, 'user') AS role,
         u.createdAt,
         CASE WHEN c.user_id IS NULL THEN 0 ELSE 1 END AS connectedFlag,
         COALESCE(t.cnt, 0) AS tradeCount
       FROM "user" u
       LEFT JOIN exchange_credential c ON c.user_id = u.id
       LEFT JOIN (
         SELECT user_id, COUNT(*) AS cnt FROM trade GROUP BY user_id
       ) t ON t.user_id = u.id
       ORDER BY
         CASE COALESCE(u.role, 'user')
           WHEN 'admin' THEN 0
           ELSE 1
         END,
         u.createdAt ASC`
    )
    .all() as Array<
      Omit<AdminUserRow, "connected"> & { connectedFlag: 0 | 1 }
    >;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.createdAt,
    connected: row.connectedFlag === 1,
    tradeCount: Number(row.tradeCount),
  }));
}
