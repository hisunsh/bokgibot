"use client";

import {
  BadgeCheck,
  Eye,
  EyeOff,
  KeyRound,
  Link2,
  Lock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  Unlink,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { requestDisconnect, requestSync } from "@/lib/sync-client";
import type { CredentialStatus, DashboardSnapshot } from "@/lib/types";
import { cn } from "@/lib/utils";

const LOOKBACK_OPTIONS = [7, 30, 90] as const;

type ApiConnectCardProps = {
  /** 서버에 저장된 자격 증명 상태 */
  credential: CredentialStatus;
  onCredentialChange: (credential: CredentialStatus) => void;
  /** 동기화 성공 시 대시보드 전체 데이터를 교체한다. */
  onSynced: (snapshot: DashboardSnapshot) => void;
  onDisconnected: () => void;
};

export function ApiConnectCard({
  credential,
  onCredentialChange,
  onSynced,
  onDisconnected,
}: ApiConnectCardProps) {
  /**
   * 입력한 평문 키는 최초 연동 요청 한 번에만 쓰이고 즉시 버린다.
   * 이후 재조회는 서버에 봉인 저장된 키를 쓰므로 브라우저가 키를 들고 있을 필요가 없다.
   */
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [lookbackDays, setLookbackDays] = useState<number>(30);
  const [isSyncing, setIsSyncing] = useState(false);

  const connected = credential.connected;
  const canSubmit = connected
    ? !isSyncing
    : apiKey.trim().length > 0 && secretKey.trim().length > 0 && !isSyncing;

  async function sync(days: number, withNewKeys: boolean) {
    setIsSyncing(true);
    const toastId = toast.loading("바이낸스에서 체결 내역을 불러오는 중...", {
      description: `최근 ${days}일 구간을 조회합니다. 거래가 많으면 20초 이상 걸릴 수 있습니다.`,
    });

    const response = await requestSync({
      ...(withNewKeys
        ? { apiKey: apiKey.trim(), secretKey: secretKey.trim() }
        : {}),
      lookbackDays: days,
    });
    setIsSyncing(false);

    if (!response.ok) {
      toast.error("동기화에 실패했습니다", {
        id: toastId,
        description: response.error.message,
        duration: 10_000,
      });
      return;
    }

    const { snapshot } = response;
    onSynced(snapshot);

    if (withNewKeys) {
      // 평문 키를 화면과 메모리에서 즉시 지운다. 서버에는 봉인된 값이 저장됐다.
      setApiKey("");
      setSecretKey("");
      setShowSecret(false);
      onCredentialChange({
        connected: true,
        permissions: snapshot.permissions,
        registeredAt: new Date().toISOString(),
      });
    }

    if (snapshot.trades.length === 0) {
      toast.warning("연동은 됐지만 복기할 거래가 없습니다", {
        id: toastId,
        description: `최근 ${days}일 동안 청산이 완료된 선물 포지션을 찾지 못했습니다. 조회 기간을 늘려 보세요.`,
        duration: 8_000,
      });
      return;
    }

    toast.success("실제 매매 기록으로 갱신했습니다", {
      id: toastId,
      description: `${snapshot.symbols.length}개 심볼 · 누적 청산 ${snapshot.trades.length}건`,
      duration: 6_000,
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    void sync(lookbackDays, !connected);
  }

  function handleLookbackChange(days: number) {
    setLookbackDays(days);
    if (connected && !isSyncing) void sync(days, false);
  }

  async function handleDisconnect() {
    setIsSyncing(true);
    const result = await requestDisconnect(false);
    setIsSyncing(false);

    if (!result.ok) {
      toast.error("연동 해제 실패", { description: result.message });
      return;
    }

    setApiKey("");
    setSecretKey("");
    setShowSecret(false);
    onCredentialChange({ connected: false });
    onDisconnected();
    toast.info("연동을 해제했습니다", {
      description:
        "저장된 API 키를 삭제했습니다. 쌓아 둔 거래 기록은 그대로 남아 있습니다.",
    });
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>
          <span className="flex size-6 items-center justify-center rounded-md bg-amber-400/10 text-amber-300">
            <Link2 className="size-3.5" aria-hidden />
          </span>
          바이낸스 Read-Only API 연동
          {connected ? (
            <Badge variant="profit" className="ml-auto">
              <BadgeCheck className="size-3" aria-hidden />
              연동 완료
            </Badge>
          ) : (
            <Badge variant="default" className="ml-auto">
              미연동
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {connected ? (
            <>
              등록된 키{" "}
              <span className="tabular font-semibold text-slate-300">
                {credential.apiKeyHint ?? "••••"}
              </span>
              로 조회합니다. 키는 암호화되어 저장돼 있어 다시 입력할 필요가 없습니다.
            </>
          ) : (
            <>
              키를 등록하면 USDT-M 선물 체결 내역을 불러와 매매일지를 자동으로 만듭니다.
            </>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        {connected ? null : (
          <div className="flex items-start gap-2 rounded-sm border border-loss/30 bg-loss/10 px-3 py-2">
            <TriangleAlert
              className="text-loss mt-0.5 size-4 shrink-0"
              aria-hidden
            />
            <p className="text-[11px] leading-relaxed text-red-200">
              본 서비스는{" "}
              <strong className="font-semibold">조회(Read) 권한</strong>만 필요하며,{" "}
              <strong className="font-semibold">
                출금(Withdraw) 권한은 절대 허용하지 마세요.
              </strong>{" "}
              출금 권한이 켜진 키는 서버에서 거부합니다.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {connected ? null : (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="api-key">
                  <KeyRound className="size-3" aria-hidden />
                  API Key
                </Label>
                <Input
                  id="api-key"
                  name="apiKey"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="예: 4f8b2c9e1a7d..."
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  disabled={isSyncing}
                  className="tabular"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="secret-key">
                  <Lock className="size-3" aria-hidden />
                  Secret Key
                </Label>
                <div className="relative">
                  <Input
                    id="secret-key"
                    name="secretKey"
                    type={showSecret ? "text" : "password"}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="••••••••••••••••••••"
                    value={secretKey}
                    onChange={(event) => setSecretKey(event.target.value)}
                    disabled={isSyncing}
                    className="tabular pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret((prev) => !prev)}
                    aria-label={
                      showSecret ? "Secret Key 숨기기" : "Secret Key 표시"
                    }
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-500 transition-colors hover:text-slate-300"
                  >
                    {showSecret ? (
                      <EyeOff className="size-4" aria-hidden />
                    ) : (
                      <Eye className="size-4" aria-hidden />
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lookback">조회 기간</Label>
            <div
              id="lookback"
              role="group"
              aria-label="조회 기간 선택"
              className="border-surface-border flex rounded-sm border bg-[#131722] p-px"
            >
              {LOOKBACK_OPTIONS.map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => handleLookbackChange(days)}
                  aria-pressed={lookbackDays === days}
                  disabled={isSyncing}
                  className={cn(
                    "flex-1 rounded-sm px-2 py-1.5 text-[11px] font-medium transition-colors disabled:opacity-50",
                    lookbackDays === days
                      ? "bg-surface-overlay text-[#f0f3fa]"
                      : "text-[#787b86] hover:text-[#d1d4dc]"
                  )}
                >
                  최근 {days}일
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" size="lg" disabled={!canSubmit}>
            {isSyncing ? (
              <>
                <RefreshCw className="size-4 animate-spin" aria-hidden />
                불러오는 중...
              </>
            ) : connected ? (
              <>
                <RefreshCw className="size-4" aria-hidden />
                다시 불러오기
              </>
            ) : (
              <>
                <ShieldCheck className="size-4" aria-hidden />
                연동하기
              </>
            )}
          </Button>

          {connected ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisconnect}
              disabled={isSyncing}
            >
              <Unlink className="size-3.5" aria-hidden />
              연동 해제 (거래 기록은 보존)
            </Button>
          ) : null}
        </form>

        <div className="border-surface-border mt-auto rounded-sm border bg-[#181c27] p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">
            <ShieldAlert className="size-3.5 text-amber-300" aria-hidden />
            키 처리 방식
          </p>
          <ul className="mt-2 space-y-1 text-[11px] text-slate-400">
            <li className="flex gap-1.5">
              <span
                aria-hidden
                className="bg-profit mt-1.5 size-1.5 shrink-0 rounded-full"
              />
              AES-256-GCM 으로 암호화해 저장하며, 평문은 조회 순간에만 복호화합니다.
            </li>
            <li className="flex gap-1.5">
              <span
                aria-hidden
                className="bg-profit mt-1.5 size-1.5 shrink-0 rounded-full"
              />
              암호문이 계정에 묶여 있어 다른 사용자 계정으로 옮겨도 복호화되지 않습니다.
            </li>
            <li className="flex gap-1.5">
              <span
                aria-hidden
                className="bg-loss mt-1.5 size-1.5 shrink-0 rounded-full"
              />
              매 조회마다 권한을 재확인해 출금 권한이 감지되면 즉시 중단합니다.
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
