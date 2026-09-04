import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";

import { SUPER_ROLE, USER_ROLE } from "@/lib/auth-roles";
import { sqlite } from "@/lib/db/client";

const DAY_SECONDS = 60 * 60 * 24;

function requireSecret() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "BETTER_AUTH_SECRET 환경변수가 없거나 너무 짧습니다. `openssl rand -base64 32` 로 생성해 .env.local 에 넣어 주세요."
    );
  }
  return secret;
}

function trustedOrigins() {
  const origins = new Set<string>([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]);

  const fromEnv = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv) {
    try {
      const url = new URL(fromEnv);
      origins.add(url.origin);
    } catch {
      // 잘못된 URL 은 무시한다. 기본 localhost 목록은 그대로 남는다.
    }
  }

  return [...origins];
}

export const auth = betterAuth({
  database: sqlite,
  secret: requireSecret(),
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  trustedOrigins: trustedOrigins(),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 7 * DAY_SECONDS,
    updateAge: DAY_SECONDS,
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },
  plugins: [
    admin({
      defaultRole: USER_ROLE,
      adminRoles: [SUPER_ROLE],
    }),
    // nextCookies 는 반드시 마지막에 와야 한다.
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
