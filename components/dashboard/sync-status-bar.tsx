"use client";

import { ChevronRight, Database, Info, Radio } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import type { DashboardSnapshot } from "@/lib/types";
import { cn } from "@/lib/utils";

type SyncStatusBarProps = {
  snapshot: DashboardSnapshot;
};

function formatSyncedAt(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(iso));
}

export function SyncStatusBar({ snapshot }: SyncStatusBarProps) {
  const [showNotes, setShowNotes] = useState(false);
  const isLive = snapshot.source === "binance";

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-2.5",
        isLive
          ? "border-profit/25 bg-profit/5"
          : "border-surface-border bg-surface-raised/50"
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Badge variant={isLive ? "profit" : "default"}>
          {isLive ? (
            <Radio className="size-3" aria-hidden />
          ) : (
            <Database className="size-3" aria-hidden />
          )}
          {isLive ? "실제 매매 기록" : "예시 데이터"}
        </Badge>

        <p className="text-[11px] text-slate-400">
          {isLive ? (
            <>
              최근 {snapshot.lookbackDays}일 · 심볼 {snapshot.symbols.length}개 ·
              청산 완료 {snapshot.trades.length}건
              {snapshot.openPositions > 0
                ? ` · 보유 중 ${snapshot.openPositions}건 제외`
                : ""}
            </>
          ) : (
            <>
              아직 바이낸스 계정이 연동되지 않았습니다. 우측 카드에서 Read-Only 키를
              등록하면 실제 기록으로 바뀝니다.
            </>
          )}
        </p>

        {isLive ? (
          <span className="tabular text-[11px] text-slate-500">
            {formatSyncedAt(snapshot.syncedAt)} 기준
          </span>
        ) : null}

        {snapshot.notes.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowNotes((prev) => !prev)}
            aria-expanded={showNotes}
            className="ml-auto flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-amber-300 transition-colors hover:bg-amber-400/10"
          >
            <Info className="size-3" aria-hidden />
            데이터 주의사항 {snapshot.notes.length}건
            <ChevronRight
              className={cn(
                "size-3 transition-transform",
                showNotes && "rotate-90"
              )}
              aria-hidden
            />
          </button>
        ) : null}
      </div>

      {showNotes && snapshot.notes.length > 0 ? (
        <ul className="border-surface-border mt-2.5 space-y-1.5 border-t pt-2.5">
          {snapshot.notes.map((note) => (
            <li
              key={note}
              className="flex gap-2 text-[11px] leading-relaxed text-slate-400"
            >
              <span
                aria-hidden
                className="mt-1.5 size-1 shrink-0 rounded-full bg-amber-400/70"
              />
              {note}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
