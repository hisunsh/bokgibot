import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";

// 비밀번호 해싱과 세션 서명에 node 전용 API 가 필요하다.
export const runtime = "nodejs";

export const { GET, POST } = toNextJsHandler(auth);
