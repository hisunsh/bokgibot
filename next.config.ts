import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 상위 디렉터리의 package-lock.json 때문에 Turbopack이 루트를 잘못 추론하는 것을 막는다.
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
