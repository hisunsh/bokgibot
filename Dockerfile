# 복기봇 프로덕션 이미지
#
# 단계를 나눈 이유: better-sqlite3 는 네이티브 애드온이라 빌드에 컴파일 툴체인이
# 필요하지만, 실행할 때는 컴파일된 .node 파일만 있으면 된다. 툴체인을 최종
# 이미지에 남기지 않아 크기와 공격 표면을 함께 줄인다.

# ---------- 1) 의존성 ----------
FROM node:24-bookworm-slim AS deps
WORKDIR /app

# better-sqlite3 의 prebuilt 바이너리가 없을 때 소스 컴파일로 폴백하기 위한 툴체인.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# 락파일만 먼저 복사하면 소스가 바뀌어도 의존성 레이어 캐시가 유지된다.
COPY package.json package-lock.json ./
RUN npm ci

# ---------- 2) 빌드 ----------
FROM node:24-bookworm-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# 빌드 중 lib/db/client.ts 가 평가되면 SQLite 파일을 만들려 한다.
# 이미지 레이어에 DB 가 굳어버리지 않도록 임시 경로로 돌린다.
ENV BOKGIBOT_DB_PATH=/tmp/build-placeholder.db
# auth 모듈이 부팅 시 시크릿 길이를 검사하므로 빌드 통과용 더미 값을 준다.
# 실제 값은 런타임에 Fly 시크릿으로 주입된다.
ENV BETTER_AUTH_SECRET=build-time-placeholder-secret-value-000000
ENV BOKGIBOT_ENCRYPTION_KEY=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=

RUN npm run build

# ---------- 3) 실행 ----------
FROM node:24-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV BOKGIBOT_DB_PATH=/data/bokgibot.db

RUN mkdir -p /data \
  && apt-get update \
  && apt-get install -y --no-install-recommends util-linux \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod 755 /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
