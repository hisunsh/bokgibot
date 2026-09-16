"use client";

import { ChevronLeft, ChevronRight, Database, Loader2, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

type TableSummary = {
  name: string;
  label: string;
  rows: number;
};

type ColumnInfo = {
  name: string;
  kind: "text" | "flag" | "number" | "timeMs" | "iso";
  editable: boolean;
};

type TableRow = {
  pk: Record<string, string>;
  cells: Array<{ name: string; display: string; raw: string }>;
};

type TablePage = {
  name: string;
  label: string;
  pk: string[];
  columns: ColumnInfo[];
  rows: TableRow[];
  total: number;
  offset: number;
  pageSize: number;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function AdminDbBrowser() {
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [dbBytes, setDbBytes] = useState<number | null>(null);
  const [selected, setSelected] = useState<string>("user");
  const [page, setPage] = useState<TablePage | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState<TableRow | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setOffset(0);
  }, [selected, debouncedQuery]);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/admin/db", {
          signal: controller.signal,
          cache: "no-store",
        });
        const body = (await response.json()) as {
          ok?: boolean;
          tables?: TableSummary[];
          dbBytes?: number | null;
          error?: { message?: string };
        };
        if (!response.ok || body.ok === false) {
          throw new Error(body.error?.message ?? "목록을 불러오지 못했습니다.");
        }
        setTables(body.tables ?? []);
        setDbBytes(body.dbBytes ?? null);
        setSelected((current) => {
          const names = (body.tables ?? []).map((table) => table.name);
          return names.includes(current) ? current : (names[0] ?? current);
        });
      } catch (caught) {
        if (controller.signal.aborted) return;
        setError(caught instanceof Error ? caught.message : "조회에 실패했습니다.");
      }
    })();
    return () => controller.abort();
  }, [reload]);

  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setError(null);

    void (async () => {
      try {
        const params = new URLSearchParams({
          table: selected,
          offset: String(offset),
        });
        if (debouncedQuery) params.set("q", debouncedQuery);

        const response = await fetch(`/api/admin/db?${params}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const body = (await response.json()) as {
          ok?: boolean;
          page?: TablePage;
          error?: { message?: string };
        };
        if (!response.ok || body.ok === false || !body.page) {
          throw new Error(body.error?.message ?? "행을 불러오지 못했습니다.");
        }
        setPage(body.page);
      } catch (caught) {
        if (controller.signal.aborted) return;
        setError(
          caught instanceof Error ? caught.message : "조회에 실패했습니다."
        );
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    })();

    return () => controller.abort();
  }, [selected, offset, debouncedQuery, reload]);

  const pageSize = page?.pageSize ?? 40;
  const total = page?.total ?? 0;
  const canPrev = offset > 0;
  const canNext = offset + pageSize < total;
  const editableColumns = page?.columns.filter((column) => column.editable) ?? [];

  function openEdit(row: TableRow) {
    const next: Record<string, string> = {};
    for (const cell of row.cells) {
      const column = page?.columns.find((item) => item.name === cell.name);
      if (!column?.editable) continue;
      next[cell.name] = cell.raw;
    }
    setDraft(next);
    setEditing(row);
  }

  async function saveEdit() {
    if (!page || !editing) return;
    setSaving(true);
    try {
      const response = await fetch("/api/admin/db", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          table: page.name,
          pk: editing.pk,
          patch: draft,
        }),
      });
      const body = (await response.json()) as {
        ok?: boolean;
        error?: { message?: string };
      };
      if (!response.ok || body.ok === false) {
        throw new Error(body.error?.message ?? "수정하지 못했습니다.");
      }
      toast.success("저장했습니다");
      setEditing(null);
      setReload((value) => value + 1);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "수정하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function removeRow(row: TableRow) {
    if (!page) return;
    const label = page.name === "user" ? "계정과 매매 기록이 함께 삭제됩니다. " : "";
    if (!window.confirm(`${label}이 행을 삭제할까요?`)) return;

    try {
      const response = await fetch("/api/admin/db", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ table: page.name, pk: row.pk }),
      });
      const body = (await response.json()) as {
        ok?: boolean;
        error?: { message?: string };
      };
      if (!response.ok || body.ok === false) {
        throw new Error(body.error?.message ?? "삭제하지 못했습니다.");
      }
      toast.success("삭제했습니다");
      setEditing(null);
      setReload((value) => value + 1);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "삭제하지 못했습니다.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[11px] leading-relaxed text-slate-500">
        슈퍼 계정만 볼 수 있습니다. 비밀번호·API 비밀키·세션 토큰은 숨깁니다.
        {dbBytes != null ? ` · DB ${formatBytes(dbBytes)}` : null}
      </p>

      <div className="flex flex-wrap gap-2">
        {tables.map((table) => (
          <button
            key={table.name}
            type="button"
            onClick={() => setSelected(table.name)}
            className={
              selected === table.name
                ? "rounded-sm bg-amber-400/15 px-2.5 py-1 text-[11px] font-semibold text-amber-200"
                : "rounded-sm bg-surface-overlay px-2.5 py-1 text-[11px] font-medium text-[#787b86] hover:text-[#d1d4dc]"
            }
          >
            {table.label}
            <span className="tabular ml-1.5 text-slate-500">{table.rows}</span>
          </button>
        ))}
      </div>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>
              <Database className="size-4 text-amber-300" aria-hidden />
              {page?.label ?? "테이블"}
            </CardTitle>
            <CardDescription>
              {total.toLocaleString("ko-KR")}행 · 수정·삭제 가능
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="검색"
              className="h-8 w-44 text-xs"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!canPrev || busy}
              onClick={() => setOffset((value) => Math.max(0, value - pageSize))}
            >
              <ChevronLeft className="size-3.5" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!canNext || busy}
              onClick={() => setOffset((value) => value + pageSize)}
            >
              <ChevronRight className="size-3.5" aria-hidden />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {error ? (
            <p className="px-5 pb-5 text-sm text-red-400">{error}</p>
          ) : (
            <div className="relative overflow-x-auto">
              {busy ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/40">
                  <Loader2 className="size-5 animate-spin text-slate-400" aria-hidden />
                </div>
              ) : null}
              <table className="w-full min-w-[720px] border-collapse text-xs">
                <thead>
                  <tr className="border-surface-border border-y bg-slate-950/40 text-[11px] text-slate-500">
                    <th className="px-5 py-2 text-left font-medium">관리</th>
                    {(page?.columns ?? []).map((column) => (
                      <th
                        key={column.name}
                        className="whitespace-nowrap px-3 py-2 text-left font-medium last:pr-5"
                      >
                        {column.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(page?.rows ?? []).length === 0 ? (
                    <tr>
                      <td
                        className="px-5 py-8 text-slate-500"
                        colSpan={Math.max(2, (page?.columns.length ?? 0) + 1)}
                      >
                        행이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    page?.rows.map((row, index) => (
                      <tr
                        key={`${page.name}-${page.offset}-${index}`}
                        className="border-surface-border/70 border-b last:border-b-0"
                      >
                        <td className="px-5 py-2">
                          <div className="flex items-center gap-1">
                            {editableColumns.length > 0 ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => openEdit(row)}
                              >
                                <Pencil className="size-3.5" aria-hidden />
                                수정
                              </Button>
                            ) : null}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-red-300 hover:text-red-200"
                              onClick={() => void removeRow(row)}
                            >
                              <Trash2 className="size-3.5" aria-hidden />
                              삭제
                            </Button>
                          </div>
                        </td>
                        {row.cells.map((cell) => (
                          <td
                            key={cell.name}
                            title={cell.display}
                            className="max-w-[240px] truncate px-3 py-2 text-slate-300 last:pr-5"
                          >
                            {cell.display || "—"}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {editing && page ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-4 sm:items-center">
          <div className="border-surface-border bg-surface-raised max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-sm border p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-100">행 수정</h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditing(null)}
              >
                <X className="size-4" aria-hidden />
              </Button>
            </div>
            <div className="flex flex-col gap-3">
              {editableColumns.map((column) => (
                <div key={column.name} className="flex flex-col gap-1.5">
                  <Label htmlFor={`edit-${column.name}`}>{column.name}</Label>
                  {column.kind === "flag" ? (
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        id={`edit-${column.name}`}
                        type="checkbox"
                        checked={draft[column.name] === "1"}
                        onChange={(event) =>
                          setDraft((value) => ({
                            ...value,
                            [column.name]: event.target.checked ? "1" : "0",
                          }))
                        }
                      />
                      예
                    </label>
                  ) : (
                    <Input
                      id={`edit-${column.name}`}
                      value={draft[column.name] ?? ""}
                      onChange={(event) =>
                        setDraft((value) => ({
                          ...value,
                          [column.name]: event.target.value,
                        }))
                      }
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditing(null)}
              >
                취소
              </Button>
              <Button
                type="button"
                disabled={saving || editableColumns.length === 0}
                onClick={() => void saveEdit()}
              >
                {saving ? "저장 중..." : "저장"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
