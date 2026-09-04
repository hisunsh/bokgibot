import type { RawUserTrade } from "@/lib/binance/endpoints";
import type { PositionSide, Trade } from "@/lib/types";

/** 부동소수 누적 오차 때문에 보유 수량이 정확히 0 이 되지 않는 것을 흡수한다. */
const QTY_EPSILON = 1e-9;

type OpenPosition = {
  side: PositionSide;
  /** 부호 있는 보유 수량. 양수는 롱, 음수는 숏 노출. */
  signedQty: number;
  entryQty: number;
  entryNotional: number;
  entryFills: number;
  exitQty: number;
  exitNotional: number;
  exitFills: number;
  realizedPnl: number;
  /** USDT 로 지불된 수수료 합계 */
  feeUsdt: number;
  openedAt: number;
  closedAt: number;
  firstFillId: number;
};

export type ReconstructionResult = {
  /** 진입과 청산이 모두 기간 안에서 확인된 포지션 */
  trades: Trade[];
  /** 기간 종료 시점에 아직 열려 있어 복기 대상에서 제외한 포지션 수 */
  openPositions: number;
  /** 기간 이전에 진입해 진입가를 알 수 없는 청산 건수 */
  orphanExits: number;
  /** orphan 청산들의 순손익 합계 (요약 수치와의 차이를 안내할 때 사용) */
  orphanNetPnl: number;
  /** BNB 등 USDT 가 아닌 자산으로 낸 수수료가 있었는지 */
  hasNonUsdtFee: boolean;
  /** 기간 내 총 체결 명목 거래량 (USDT) */
  tradedVolume: number;
};

function createPosition(
  side: PositionSide,
  fillId: number,
  time: number
): OpenPosition {
  return {
    side,
    signedQty: 0,
    entryQty: 0,
    entryNotional: 0,
    entryFills: 0,
    exitQty: 0,
    exitNotional: 0,
    exitFills: 0,
    realizedPnl: 0,
    feeUsdt: 0,
    openedAt: time,
    closedAt: time,
    firstFillId: fillId,
  };
}

function formatDuration(ms: number) {
  const minutes = Math.max(1, Math.round(ms / 60_000));
  if (minutes < 60) return `${minutes}분`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest > 0 ? `${hours}시간 ${rest}분` : `${hours}시간`;
  }

  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours > 0 ? `${days}일 ${restHours}시간` : `${days}일`;
}

/**
 * 체결 내역만으로는 트레이더가 어떤 전략을 썼는지 알 수 없으므로,
 * 보유 시간·분할 여부·수수료 비중처럼 관찰 가능한 특성으로 태그를 자동 부여한다.
 * 사용자가 직접 태그를 편집하는 기능이 붙으면 이 값이 기본값 역할을 한다.
 */
function buildAutoTags(
  position: OpenPosition,
  leverage: number,
  netPnl: number
): string[] {
  const tags: string[] = [];
  const holdingMs = position.closedAt - position.openedAt;

  if (holdingMs < 15 * 60_000) tags.push("#스캘핑");
  else if (holdingMs < 24 * 60 * 60_000) tags.push("#데이트레이딩");
  else tags.push("#스윙");

  if (position.entryFills > 1) tags.push("#분할진입");
  if (position.exitFills > 1) tags.push("#분할청산");
  if (leverage >= 20) tags.push("#고레버리지");

  const grossPnl = Math.abs(position.realizedPnl);
  if (grossPnl > 0 && position.feeUsdt / grossPnl >= 0.3) {
    tags.push("#수수료과다");
  }

  tags.push(netPnl >= 0 ? "#익절" : "#손절");
  return tags;
}

function finalizePosition(
  symbol: string,
  position: OpenPosition,
  leverage: number
): Trade | null {
  if (position.entryQty <= 0 || position.exitQty <= 0) return null;

  const entryPrice = position.entryNotional / position.entryQty;
  const exitPrice = position.exitNotional / position.exitQty;
  const fee = position.feeUsdt;
  const netPnl = position.realizedPnl - fee;
  // 체결 내역에는 증거금이 없으므로 진입 명목가와 레버리지로 역산한다.
  const margin = position.entryNotional / Math.max(1, leverage);
  const pnlPercent = margin > 0 ? (netPnl / margin) * 100 : 0;

  return {
    id: `${symbol}-${position.firstFillId}`,
    closedAt: new Date(position.closedAt).toISOString(),
    symbol,
    side: position.side,
    leverage,
    entryPrice,
    exitPrice,
    netPnl: Number(netPnl.toFixed(4)),
    pnlPercent: Number(pnlPercent.toFixed(2)),
    fee: Number(fee.toFixed(4)),
    tags: buildAutoTags(position, leverage, netPnl),
    memo: `${position.entryFills}회 진입 / ${position.exitFills}회 청산 · 보유 ${formatDuration(
      position.closedAt - position.openedAt
    )}`,
  };
}

/**
 * 개별 체결(fill)을 시간순으로 재생해 청산까지 완료된 포지션으로 복원한다.
 *
 * 부호 있는 수량으로 넷팅하기 때문에 단방향(one-way) 모드와 헤지 모드,
 * 그리고 한 번의 체결로 포지션이 반대로 뒤집히는 경우까지 같은 경로로 처리된다.
 * `positionSide` 로 그룹을 나누므로 헤지 모드의 롱/숏이 서로 상쇄되지 않는다.
 */
export function reconstructTrades(
  fills: RawUserTrade[],
  leverageMap: Map<string, number>
): ReconstructionResult {
  const groups = new Map<string, RawUserTrade[]>();
  for (const fill of fills) {
    const key = `${fill.symbol}|${fill.positionSide}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(fill);
    else groups.set(key, [fill]);
  }

  const trades: Trade[] = [];
  let openPositions = 0;
  let orphanExits = 0;
  let orphanNetPnl = 0;
  let hasNonUsdtFee = false;
  let tradedVolume = 0;

  for (const [key, bucket] of groups) {
    const symbol = key.split("|")[0];
    const leverage = leverageMap.get(symbol) ?? 1;

    bucket.sort((a, b) => a.time - b.time || a.id - b.id);

    let position: OpenPosition | null = null;

    for (const fill of bucket) {
      const fillQty = Math.abs(Number(fill.qty));
      if (!Number.isFinite(fillQty) || fillQty <= 0) continue;

      const price = Number(fill.price);
      const commission = Number(fill.commission) || 0;
      const realizedPnl = Number(fill.realizedPnl) || 0;
      const isUsdtFee = fill.commissionAsset === "USDT";
      if (commission > 0 && !isUsdtFee) hasNonUsdtFee = true;

      tradedVolume += Number(fill.quoteQty) || price * fillQty;

      // 롱 노출을 양수로 두면 매수는 항상 +, 매도는 항상 - 가 된다.
      let remaining = fill.side === "BUY" ? fillQty : -fillQty;
      /** 이 체결의 수수료를 여러 포지션에 나눠 담을 때 쓰는 비율 */
      const feePerQty = isUsdtFee ? commission / fillQty : 0;
      let pnlAttributed = false;

      while (Math.abs(remaining) > QTY_EPSILON) {
        const isOpening =
          position === null || Math.abs(position.signedQty) <= QTY_EPSILON;

        if (isOpening) {
          // 진입 체결이 없는데 실현 손익이 붙어 있으면, 조회 기간 이전에 잡은
          // 포지션을 청산한 것이다. 진입가를 알 수 없으므로 별도로 집계한다.
          if (realizedPnl !== 0 && !pnlAttributed) {
            orphanExits += 1;
            orphanNetPnl += realizedPnl - feePerQty * Math.abs(remaining);
            pnlAttributed = true;
            remaining = 0;
            break;
          }

          position = createPosition(
            remaining > 0 ? "LONG" : "SHORT",
            fill.id,
            fill.time
          );
        }

        const current = position as OpenPosition;
        const sameDirection =
          Math.abs(current.signedQty) <= QTY_EPSILON ||
          Math.sign(current.signedQty) === Math.sign(remaining);

        if (sameDirection) {
          const appliedQty = Math.abs(remaining);
          current.entryQty += appliedQty;
          current.entryNotional += price * appliedQty;
          current.entryFills += 1;
          current.feeUsdt += feePerQty * appliedQty;
          current.signedQty = Number(
            (current.signedQty + remaining).toFixed(12)
          );
          current.closedAt = fill.time;
          remaining = 0;
          continue;
        }

        // 반대 방향 체결 → 보유 수량만큼 청산하고 남으면 반대 포지션으로 넘긴다.
        const closeQty = Math.min(
          Math.abs(remaining),
          Math.abs(current.signedQty)
        );
        current.exitQty += closeQty;
        current.exitNotional += price * closeQty;
        current.exitFills += 1;
        current.feeUsdt += feePerQty * closeQty;
        current.closedAt = fill.time;

        // 실현 손익은 청산분에서 전부 발생하므로 비율로 나누지 않고 한 번만 반영한다.
        if (!pnlAttributed) {
          current.realizedPnl += realizedPnl;
          pnlAttributed = true;
        }

        const direction = Math.sign(remaining);
        current.signedQty = Number(
          (current.signedQty + direction * closeQty).toFixed(12)
        );
        remaining = Number((remaining - direction * closeQty).toFixed(12));

        if (Math.abs(current.signedQty) <= QTY_EPSILON) {
          const trade = finalizePosition(symbol, current, leverage);
          if (trade) trades.push(trade);
          else {
            orphanExits += 1;
            orphanNetPnl += current.realizedPnl - current.feeUsdt;
          }
          position = null;
        }
      }
    }

    if (position && Math.abs(position.signedQty) > QTY_EPSILON) {
      openPositions += 1;
    }
  }

  trades.sort(
    (a, b) => new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime()
  );

  return {
    trades,
    openPositions,
    orphanExits,
    orphanNetPnl: Number(orphanNetPnl.toFixed(4)),
    hasNonUsdtFee,
    tradedVolume: Number(tradedVolume.toFixed(2)),
  };
}
