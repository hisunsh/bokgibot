import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/lib/auth";
import { isAdminRole, type UserRole } from "@/lib/auth-roles";
import { seedSuperAdminOnce } from "@/lib/auth-seed";
import { SyncError } from "@/lib/binance/errors";

/**
 * 데이터 접근 계층(Data Access Layer).
 *
 * 세션 검증을 이 한 곳으로 모아 두면 "어디선가 권한 검사를 빼먹는" 실수를 줄일 수 있다.
 * Next 공식 가이드가 권장하는 패턴이다. React 의 cache 로 감싸서 한 번의 렌더링 안에서
 * 여러 번 호출해도 세션 조회는 한 번만 일어난다.
 */
export const getSession = cache(async () => {
  await seedSuperAdminOnce();
  return auth.api.getSession({ headers: await headers() });
});

function withRole<T extends { role?: string | null }>(user: T) {
  return { ...user, role: (user.role ?? "user") as UserRole };
}

/** 서버 컴포넌트/페이지에서 사용. 미인증이면 로그인 페이지로 보낸다. */
export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return withRole(session.user);
}

/** 슈퍼/관리자만 통과. 일반 사용자는 대시보드로 돌려보낸다. */
export async function requireAdmin() {
  const user = await requireUser();
  if (!isAdminRole(user.role)) redirect("/");
  return user;
}

/**
 * API 라우트에서 사용. 리다이렉트 대신 401 로 변환할 수 있는 오류를 던진다.
 * 라우트 핸들러에서 redirect() 를 쓰면 클라이언트 fetch 가 HTML 을 받게 되어 곤란하다.
 */
export async function requireUserId() {
  const session = await getSession();
  if (!session) {
    throw new SyncError(
      "UNAUTHORIZED",
      "로그인이 필요합니다. 다시 로그인한 뒤 시도해 주세요.",
      401
    );
  }
  return session.user.id;
}
