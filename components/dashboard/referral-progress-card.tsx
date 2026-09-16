import { Progress } from "@/components/ui/progress";
import { formatUsd } from "@/lib/format";
import type { ReferralStatus } from "@/lib/types";

type ReferralProgressCardProps = {
  status: ReferralStatus;
};

export function ReferralProgressCard({ status }: ReferralProgressCardProps) {
  const ratio =
    status.requiredVolume > 0
      ? Math.min(100, (status.currentVolume / status.requiredVolume) * 100)
      : 0;

  return (
    <div className="min-w-0 flex-1 lg:max-w-sm">
      <div className="mb-1 flex items-baseline justify-between gap-3 text-[11px]">
        <span className="text-[#787b86]">누적 거래량</span>
        <span className="tabular text-[#b2b5be]">
          {formatUsd(status.currentVolume, { decimals: 0 })} /{" "}
          {formatUsd(status.requiredVolume, { decimals: 0 })}
        </span>
      </div>
      <Progress value={ratio} label="누적 거래량" />
    </div>
  );
}
