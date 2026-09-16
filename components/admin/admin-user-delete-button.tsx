"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type AdminUserDeleteButtonProps = {
  userId: string;
  email: string;
  disabled?: boolean;
};

export function AdminUserDeleteButton({
  userId,
  email,
  disabled = false,
}: AdminUserDeleteButtonProps) {
  const router = useRouter();

  async function handleDelete() {
    if (
      !window.confirm(
        `${email} 계정을 삭제할까요? 매매 기록과 API 연동도 같이 지워집니다.`
      )
    ) {
      return;
    }

    const response = await fetch("/api/admin/db", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ table: "user", pk: { id: userId } }),
    });
    const body = (await response.json()) as {
      ok?: boolean;
      error?: { message?: string };
    };
    if (!response.ok || body.ok === false) {
      toast.error(body.error?.message ?? "삭제하지 못했습니다.");
      return;
    }
    toast.success("삭제했습니다");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={disabled}
      className="h-7 px-2 text-red-300 hover:text-red-200"
      onClick={() => void handleDelete()}
    >
      <Trash2 className="size-3.5" aria-hidden />
      삭제
    </Button>
  );
}
