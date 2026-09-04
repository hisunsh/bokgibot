/**
 * 아주 단순한 슬라이딩 윈도우 레이트 리미터.
 *
 * 도난당한 키를 우리 서버로 검증해 보는 용도로 악용되는 것을 막는 목적이다.
 * 인스턴스 메모리에만 존재하므로 여러 인스턴스로 확장할 때는 Redis 같은
 * 공유 저장소로 옮겨야 한다.
 */

const buckets = new Map<string, number[]>();
const MAX_BUCKETS = 5_000;

type Options = {
  windowMs: number;
  max: number;
};

export function isRateLimited(key: string, { windowMs, max }: Options) {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter(
    (timestamp) => now - timestamp < windowMs
  );

  if (recent.length >= max) {
    buckets.set(key, recent);
    return true;
  }

  recent.push(now);
  buckets.set(key, recent);

  if (buckets.size > MAX_BUCKETS) {
    for (const [bucketKey, timestamps] of buckets) {
      if (timestamps.every((timestamp) => now - timestamp >= windowMs)) {
        buckets.delete(bucketKey);
      }
    }
  }

  return false;
}

/** 프록시 뒤에서도 동작하도록 전달된 헤더에서 클라이언트 IP 를 추정한다. */
export function clientIdOf(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
