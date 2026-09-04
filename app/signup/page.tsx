import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { getSession } from "@/lib/dal";

export const metadata: Metadata = {
  title: "회원가입 · 복기봇 (Bokgibot)",
};

export default async function SignupPage() {
  if (await getSession()) redirect("/");

  return <AuthForm mode="signup" />;
}
