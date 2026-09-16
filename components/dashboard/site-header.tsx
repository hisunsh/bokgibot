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
    <header className="border-surface-border bg-surface-base sticky top-0 z-30 border-b">
      <div className="mx-auto flex w-full max-w-[1600px] items-center gap-4 px-4 py-2 sm:px-5">
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-[15px] font-bold tracking-tight text-[#f0f3fa]">
            복기봇
          </span>
          <Badge>BETA</Badge>
        </div>

        <ReferralProgressCard status={referral} />

        <div className="ml-auto">
          <UserMenu name={user.name} email={user.email} role={user.role} />
        </div>
      </div>
    </header>
  );
}
