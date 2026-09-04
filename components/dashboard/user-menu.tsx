"use client";

import { Crown, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-client";
import { isAdminRole, isSuperRole, type UserRole } from "@/lib/auth-roles";

type UserMenuProps = {
  name: string;
  email: string;
  role: UserRole;
};

export function UserMenu({ name, email, role }: UserMenuProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleSignOut() {
    setIsPending(true);
    await signOut();
    toast.success("로그아웃되었습니다");
    router.refresh();
    router.replace("/login");
  }

  return (
    <div className="flex items-center gap-2">
      <div className="hidden flex-col items-end sm:flex">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
          {name}
          {isSuperRole(role) ? (
            <Badge variant="vip">
              <Crown className="size-3" aria-hidden />
              슈퍼
            </Badge>
          ) : null}
        </span>
        <span className="text-[10px] text-slate-500">{email}</span>
      </div>
      {isAdminRole(role) ? (
        <Link
          href="/admin"
          className="hidden text-[11px] font-semibold text-amber-300 hover:underline sm:inline"
        >
          콘솔
        </Link>
      ) : null}
      <span className="border-surface-border flex size-8 items-center justify-center rounded-lg border bg-slate-800/70">
        <UserRound className="size-4 text-slate-400" aria-hidden />
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSignOut}
        disabled={isPending}
        aria-label="로그아웃"
      >
        <LogOut className="size-3.5" aria-hidden />
        <span className="hidden sm:inline">로그아웃</span>
      </Button>
    </div>
  );
}
