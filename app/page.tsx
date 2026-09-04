import { DashboardView } from "@/components/dashboard/dashboard-view";
import { requireUser } from "@/lib/dal";
import { mockSnapshot, referralStatus } from "@/lib/mock-data";
import { getCredentialStatus } from "@/lib/store/credentials";
import { loadSnapshot } from "@/lib/store/snapshot";

// 세션과 사용자별 DB 데이터를 읽으므로 정적 프리렌더링 대상이 아니다.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();

  const credential = getCredentialStatus(user.id);
  const stored = loadSnapshot(user.id);

  return (
    <DashboardView
      // 저장된 기록이 있으면 API 키 없이도 즉시 실데이터로 렌더링된다.
      initialSnapshot={stored ?? mockSnapshot}
      initialCredential={credential}
      referral={referralStatus}
      user={{ name: user.name, email: user.email, role: user.role }}
    />
  );
}
