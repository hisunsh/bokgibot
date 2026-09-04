import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { getSession } from "@/lib/dal";

export const metadata: Metadata = {
  title: "로그인 · 복기봇 (Bokgibot)",
};

export default async function LoginPage() {
  // 이미 로그인한 사용자는 대시보드로 보낸다.
  if (await getSession()) redirect("/");

  return <AuthForm mode="login" />;
}
