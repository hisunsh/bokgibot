export const USER_ROLE = "user";
/** Better Auth admin 플러그인의 관리자 역할. UI 에서는 슈퍼 계정으로 표기한다. */
export const SUPER_ROLE = "admin";

export type UserRole = typeof USER_ROLE | typeof SUPER_ROLE;

export function isAdminRole(role: string | null | undefined): boolean {
  return role === SUPER_ROLE;
}

export function isSuperRole(role: string | null | undefined): boolean {
  return role === SUPER_ROLE;
}
