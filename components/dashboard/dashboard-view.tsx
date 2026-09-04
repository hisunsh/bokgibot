"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { ApiConnectCard } from "@/components/dashboard/api-connect-card";
import { PerformanceSummaryGrid } from "@/components/dashboard/performance-summary-grid";
import { PnlChart } from "@/components/dashboard/pnl-chart";
import { SiteHeader } from "@/components/dashboard/site-header";
import { StrategyTagInsights } from "@/components/dashboard/strategy-tag-insights";
import { SyncStatusBar } from "@/components/dashboard/sync-status-bar";
import { TradeHistoryTable } from "@/components/dashboard/trade-history-table";
import type { UserRole } from "@/lib/auth-roles";
import type {
  CredentialStatus,
  DashboardSnapshot,
  ReferralStatus,
} from "@/lib/types";

type DashboardViewProps = {
  /** DB 에 쌓인 실데이터, 또는 아직 연동 전이면 더미 스냅샷 */
  initialSnapshot: DashboardSnapshot;
  initialCredential: CredentialStatus;
  referral: ReferralStatus;
  user: { name: string; email: string; role: UserRole };
};

/**
 * 대시보드의 단일 상태 보관소.
 *
 * 모든 하위 섹션이 이 컴포넌트가 들고 있는 스냅샷 하나만 바라보기 때문에,
 * 동기화가 성공하면 setSnapshot 한 번으로 KPI·차트·테이블이 동시에 갱신된다.
 */
export function DashboardView({
  initialSnapshot,
  initialCredential,
  referral,
  user,
}: DashboardViewProps) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [credential, setCredential] = useState(initialCredential);
  const isLive = snapshot.source === "binance";

  // 연동을 해제하면 서버 상태가 바뀌었으므로 서버 컴포넌트를 다시 그린다.
  // 쌓아 둔 거래 기록은 지우지 않으므로 대시보드 내용은 그대로 유지된다.
  const handleDisconnected = useCallback(() => {
    router.refresh();
  }, [router]);

  // 연동 후에는 실제 체결 명목 거래량으로 레퍼럴 달성률을 계산한다.
  const liveReferral = useMemo<ReferralStatus>(
    () =>
      isLive ? { ...referral, currentVolume: snapshot.tradedVolume } : referral,
    [isLive, referral, snapshot.tradedVolume]
  );

  return (
    <div className="bg-grid flex min-h-full flex-col">
      <SiteHeader referral={liveReferral} user={user} />

      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 px-4 py-6 sm:px-6">
        <SyncStatusBar snapshot={snapshot} />

        <PerformanceSummaryGrid summary={snapshot.summary} />

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <PnlChart data={snapshot.equityCurve} />
          </div>
          <div className="lg:col-span-4">
            <ApiConnectCard
              credential={credential}
              onCredentialChange={setCredential}
              onSynced={setSnapshot}
              onDisconnected={handleDisconnected}
            />
          </div>
        </section>

        {snapshot.tagPerformance.length > 0 ? (
          <StrategyTagInsights tags={snapshot.tagPerformance} />
        ) : null}

        <TradeHistoryTable trades={snapshot.trades} />
      </main>

      <footer className="border-surface-border border-t px-4 py-4 text-center text-[11px] text-slate-600 sm:px-6">
        복기봇 (Bokgibot) ·{" "}
        {isLive
          ? "바이낸스 USDT-M 선물 체결 내역 기준으로 계산했습니다. 투자 판단의 근거로 사용할 수 없습니다."
          : "표시된 데이터는 연동 전 미리보기용 예시입니다. 투자 판단의 근거로 사용할 수 없습니다."}
      </footer>
    </div>
  );
}
