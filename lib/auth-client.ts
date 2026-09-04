"use client";

import { createAuthClient } from "better-auth/react";

/**
 * 브라우저용 인증 클라이언트.
 * baseURL 을 비워 두면 같은 오리진의 /api/auth 를 사용한다.
 */
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
