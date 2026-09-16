"use client";

import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { signIn, signUp } from "@/lib/auth-client";

const MIN_PASSWORD_LENGTH = 10;

type AuthFormProps = {
  mode: "login" | "signup";
};

/**
 * Better Auth 가 돌려주는 오류 코드를 사용자가 조치할 수 있는 안내로 바꾼다.
 * 코드 문자열은 better-auth 1.7.2 의 실제 응답에서 확인한 값이다.
 */
function friendlyMessage(
  mode: "login" | "signup",
  code?: string,
  message?: string
) {
  switch (code) {
    case "INVALID_EMAIL_OR_PASSWORD":
    case "CREDENTIAL_ACCOUNT_NOT_FOUND":
      // 어느 쪽이 틀렸는지 알려주면 이메일 존재 여부를 캐낼 수 있으므로 뭉뚱그린다.
      return "이메일 또는 비밀번호가 올바르지 않습니다.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "이미 가입된 이메일입니다. 로그인해 주세요.";
    case "PASSWORD_TOO_SHORT":
      return `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`;
    case "PASSWORD_TOO_LONG":
      return "비밀번호가 너무 깁니다. 128자 이하로 입력해 주세요.";
    case "INVALID_EMAIL":
    case "INVALID_EMAIL_FORMAT":
      return "이메일 형식이 올바르지 않습니다.";
    case "INVALID_ORIGIN":
    case "MISSING_OR_NULL_ORIGIN":
      return "접속 주소가 허용 목록에 없습니다. http://localhost:3000 으로 열어 주세요.";
    default:
      if (message?.toLowerCase().includes("origin")) {
        return "접속 주소가 허용 목록에 없습니다. http://localhost:3000 으로 열어 주세요.";
      }
      return mode === "login"
        ? "로그인에 실패했습니다. 잠시 후 다시 시도해 주세요."
        : "회원가입에 실패했습니다. 잠시 후 다시 시도해 주세요.";
  }
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const isSignup = mode === "signup";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const canSubmit =
    email.trim().length > 0 &&
    password.length >= MIN_PASSWORD_LENGTH &&
    (!isSignup || name.trim().length > 0) &&
    !isPending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setIsPending(true);

    const { error } = isSignup
      ? await signUp.email({
          name: name.trim(),
          email: email.trim(),
          password,
        })
      : await signIn.email({ email: email.trim(), password });

    if (error) {
      setIsPending(false);
      toast.error(isSignup ? "회원가입 실패" : "로그인 실패", {
        description: friendlyMessage(mode, error.code, error.message),
        duration: 8_000,
      });
      return;
    }

    toast.success(isSignup ? "가입이 완료되었습니다" : "로그인되었습니다");
    // 서버 컴포넌트가 새 세션으로 다시 렌더링되도록 갱신한 뒤 이동한다.
    router.refresh();
    router.replace("/");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[360px]">
        <div className="mb-6">
          <h1 className="text-[22px] font-bold tracking-tight text-[#f0f3fa]">
            복기봇
          </h1>
          <p className="mt-1 text-[13px] text-[#787b86]">
            {isSignup
              ? "계정을 만든 뒤 바이낸스 키를 연동합니다."
              : "로그인하면 매매일지가 계정에 묶입니다."}
          </p>
        </div>

        <Card>
          <CardContent className="pt-5">
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {isSignup ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="name">
                    <User className="size-3" aria-hidden />
                    닉네임
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    autoComplete="nickname"
                    placeholder="복기왕"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    disabled={isPending}
                  />
                </div>
              ) : null}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">
                  <Mail className="size-3" aria-hidden />
                  이메일
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="trader@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={isPending}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">
                  <Lock className="size-3" aria-hidden />
                  비밀번호
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={isSignup ? "new-password" : "current-password"}
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    placeholder={`${MIN_PASSWORD_LENGTH}자 이상`}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={isPending}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-500 transition-colors hover:text-slate-300"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" aria-hidden />
                    ) : (
                      <Eye className="size-4" aria-hidden />
                    )}
                  </button>
                </div>
                {isSignup ? (
                  <p className="text-[11px] text-slate-500">
                    이 비밀번호가 거래소 API 키를 지키는 관문입니다. 다른 곳에서 쓰지
                    않는 것으로 설정해 주세요.
                  </p>
                ) : null}
              </div>

              <Button type="submit" size="lg" disabled={!canSubmit} className="mt-1">
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    처리 중...
                  </>
                ) : isSignup ? (
                  "가입하기"
                ) : (
                  "로그인"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-[#787b86]">
          {isSignup ? "이미 계정이 있으신가요?" : "아직 계정이 없으신가요?"}{" "}
          <Link
            href={isSignup ? "/login" : "/signup"}
            className="text-profit-soft font-semibold hover:underline"
          >
            {isSignup ? "로그인" : "회원가입"}
          </Link>
        </p>
      </div>
    </div>
  );
}
