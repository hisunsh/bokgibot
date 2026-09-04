import { Bot, Sparkles } from "lucide-react";

import { ReferralProgressCard } from "@/components/dashboard/referral-progress-card";
import { UserMenu } from "@/components/dashboard/user-menu";
import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@/lib/auth-roles";
import type { ReferralStatus } from "@/lib/types";

type SiteHeaderProps = {
  referral: ReferralStatus;
  user: { name: string; email: string; role: UserRole };
};

export function SiteHeader({ referral, user }: SiteHeaderProps) {
  return (
    <header className="border-surface-border bg-surface-base/80 sticky top-0 z-30 border-b backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="border-profit/30 bg-profit/10 flex size-9 items-center justify-center rounded-xl border">
              <Bot className="text-profit size-5" aria-hidden />
            </span>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-slate-50">
                  복기봇 <span className="text-slate-500">(Bokgibot)</span>
                </span>
                <Badge variant="vip">
                  <Sparkles className="size-3" aria-hidden />
                  VIP Beta
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500">
                API 연동 3초 만에 끝내는 선물 거래 복기 · 자동 매매일지
              </p>
            </div>
          </div>

          <div className="lg:hidden">
            <UserMenu name={user.name} email={user.email} role={user.role} />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ReferralProgressCard status={referral} />
          <div className="hidden lg:block">
            <UserMenu name={user.name} email={user.email} role={user.role} />
          </div>
        </div>
      </div>
    </header>
  );
}
