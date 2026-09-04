/** $1,234.56 / -$1,234.56 형태. signed=true 이면 양수에 + 를 붙인다. */
export function formatUsd(
  value: number,
  { signed = false, decimals = 2 }: { signed?: boolean; decimals?: number } = {}
) {
  const sign = value < 0 ? "-" : signed ? "+" : "";
  const body = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${sign}$${body}`;
}

/** 소수점 없는 통화 표기. 거래량처럼 큰 숫자에 사용. */
export function formatVolume(value: number) {
  return formatUsd(value, { decimals: 0 });
}

export function formatPercent(
  value: number,
  { signed = false, decimals = 1 }: { signed?: boolean; decimals?: number } = {}
) {
  const sign = value > 0 && signed ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

/** 심볼에 따라 유효 자릿수를 바꿔 체결가를 표기한다. */
export function formatPrice(value: number) {
  const decimals = value >= 1000 ? 1 : value >= 1 ? 3 : 5;
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * ISO 문자열을 "09.04 21:35" 형태로 표기한다.
 * 서버와 클라이언트의 렌더 결과가 어긋나지 않도록 타임존을 KST로 고정한다.
 */
export function formatDateTime(iso: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Seoul",
  }).formatToParts(new Date(iso));

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("month")}.${get("day")} ${get("hour")}:${get("minute")}`;
}

/** BTCUSDT -> BTC/USDT */
export function formatSymbol(symbol: string) {
  return symbol.endsWith("USDT")
    ? `${symbol.slice(0, -4)}/USDT`
    : symbol;
}
