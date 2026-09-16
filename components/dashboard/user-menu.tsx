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
        <span className="flex items-center gap-1.5 text-xs font-medium text-[#d1d4dc]">
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
          className="text-[11px] font-semibold text-amber-300 hover:underline"
        >
          콘솔
        </Link>
      ) : null}
      <span className="border-surface-border bg-surface-overlay flex size-7 items-center justify-center rounded-sm border">
        <UserRound className="size-3.5 text-[#787b86]" aria-hidden />
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
