import { Crown, Database, Shield, Users } from "lucide-react";
import Link from "next/link";

import { AdminUserDeleteButton } from "@/components/admin/admin-user-delete-button";
import { AdminDbBrowser } from "@/components/admin/db-browser";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isSuperRole } from "@/lib/auth-roles";
import { requireAdmin } from "@/lib/dal";
import { formatDateTime } from "@/lib/format";
import { listUsersForAdmin } from "@/lib/store/users";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const view = params.view === "db" ? "db" : "users";
  const users = listUsersForAdmin();
  const superCount = users.filter((user) => isSuperRole(user.role)).length;
  const connectedCount = users.filter((user) => user.connected).length;

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-4 px-4 py-6 sm:px-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-profit-soft flex items-center gap-1.5 text-[11px] font-semibold">
            <Crown className="size-3.5" aria-hidden />
            슈퍼 콘솔
          </p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-50">
            {view === "db" ? "데이터베이스" : "계정 관리"}
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            {admin.name} ({admin.email})
          </p>
        </div>
        <Link
          href="/"
          className="text-xs font-semibold text-slate-400 hover:text-slate-200"
        >
          ← 대시보드로
        </Link>
      </div>

      <nav className="border-surface-border flex gap-px rounded-sm border bg-[#181c27] p-px text-xs font-medium">
        <Link
          href="/admin"
          className={
            view === "users"
              ? "rounded-sm bg-surface-overlay px-3 py-1.5 text-[#f0f3fa]"
              : "rounded-sm px-3 py-1.5 text-[#787b86] hover:text-[#d1d4dc]"
          }
        >
          계정
        </Link>
        <Link
          href="/admin?view=db"
          className={
            view === "db"
              ? "rounded-sm bg-surface-overlay px-3 py-1.5 text-[#f0f3fa]"
              : "rounded-sm px-3 py-1.5 text-[#787b86] hover:text-[#d1d4dc]"
          }
        >
          데이터베이스
        </Link>
      </nav>

      {view === "db" ? (
        <AdminDbBrowser />
      ) : (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card className="p-4">
              <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <Users className="size-3.5" aria-hidden />
                전체 계정
              </p>
              <p className="tabular mt-1 text-2xl font-bold">{users.length}</p>
            </Card>
            <Card className="p-4">
              <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <Crown className="size-3.5" aria-hidden />
                슈퍼 계정
              </p>
              <p className="tabular mt-1 text-2xl font-bold">{superCount}</p>
            </Card>
            <Card className="p-4">
              <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <Shield className="size-3.5" aria-hidden />
                API 연동됨
              </p>
              <p className="tabular mt-1 text-2xl font-bold">{connectedCount}</p>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>
                <Database className="size-4 text-slate-400" aria-hidden />
                사용자 목록
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-sm">
                  <thead>
                    <tr className="border-surface-border border-y bg-slate-950/40 text-[11px] text-slate-500">
                      <th className="px-5 py-2.5 text-left font-medium">계정</th>
                      <th className="px-3 py-2.5 text-left font-medium">역할</th>
                      <th className="px-3 py-2.5 text-left font-medium">연동</th>
                      <th className="px-3 py-2.5 text-right font-medium">거래</th>
                      <th className="px-5 py-2.5 text-left font-medium">가입</th>
                      <th className="px-5 py-2.5 text-right font-medium">관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr
                        key={user.id}
                        className="border-surface-border/70 border-b last:border-b-0"
                      >
                        <td className="px-5 py-3">
                          <p className="font-semibold text-slate-100">{user.name}</p>
                          <p className="text-[11px] text-slate-500">{user.email}</p>
                        </td>
                        <td className="px-3 py-3">
                          <Badge variant={user.role === "admin" ? "vip" : "default"}>
                            {user.role === "admin" ? "슈퍼" : "사용자"}
                          </Badge>
                        </td>
                        <td className="px-3 py-3">
                          <Badge variant={user.connected ? "profit" : "default"}>
                            {user.connected ? "연동됨" : "미연동"}
                          </Badge>
                        </td>
                        <td className="tabular px-3 py-3 text-right text-xs text-slate-300">
                          {user.tradeCount}건
                        </td>
                        <td className="tabular px-5 py-3 text-xs text-slate-400">
                          {formatDateTime(user.createdAt)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <AdminUserDeleteButton
                            userId={user.id}
                            email={user.email}
                            disabled={user.id === admin.id}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
