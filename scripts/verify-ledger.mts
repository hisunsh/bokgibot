/**
 * 포지션 되감기의 회계 불변식을 검증하는 임시 스크립트.
 *
 *   실행: node --experimental-strip-types scripts/verify-ledger.ts
 *
 * 검증 내용: 체결 내역의 실현손익·수수료 총액이 복기 대상 / 기간 이전 진입 /
 * 미청산 세 갈래로 정확히 나뉘는지. 남는 금액이 있으면 되감기 로직에 결함이 있다.
 */

import { reconstructTrades } from "../lib/binance/positions.ts";

let nextId = 1;

function fill({
  symbol = "BTCUSDT",
  side,
  qty,
  price,
  realizedPnl = 0,
  commission = 0,
  commissionAsset = "USDT",
  positionSide = "BOTH",
  minutes = 0,
}: {
  symbol?: string;
  side: "BUY" | "SELL";
  qty: number;
  price: number;
  realizedPnl?: number;
  commission?: number;
  commissionAsset?: string;
  positionSide?: "LONG" | "SHORT" | "BOTH";
  minutes?: number;
}) {
  const id = nextId++;
  return {
    buyer: side === "BUY",
    commission: String(commission),
    commissionAsset,
    id,
    maker: false,
    orderId: id,
    price: String(price),
    qty: String(qty),
    quoteQty: String(qty * price),
    realizedPnl: String(realizedPnl),
    side,
    positionSide,
    symbol,
    time: Date.UTC(2026, 8, 1, 0, minutes),
  };
}

const scenarios: Array<{ name: string; fills: ReturnType<typeof fill>[] }> = [
  {
    name: "단순 롱 진입/청산",
    fills: [
      fill({ side: "BUY", qty: 1, price: 100, commission: 0.04, minutes: 0 }),
      fill({
        side: "SELL",
        qty: 1,
        price: 110,
        realizedPnl: 10,
        commission: 0.044,
        minutes: 10,
      }),
    ],
  },
  {
    name: "단순 숏 손실 청산",
    fills: [
      fill({ side: "SELL", qty: 2, price: 100, commission: 0.08, minutes: 0 }),
      fill({
        side: "BUY",
        qty: 2,
        price: 105,
        realizedPnl: -10,
        commission: 0.084,
        minutes: 30,
      }),
    ],
  },
  {
    name: "분할 진입 + 분할 청산",
    fills: [
      fill({ side: "BUY", qty: 1, price: 100, commission: 0.04, minutes: 0 }),
      fill({ side: "BUY", qty: 2, price: 98, commission: 0.078, minutes: 5 }),
      fill({
        side: "SELL",
        qty: 1.5,
        price: 105,
        realizedPnl: 8.5,
        commission: 0.063,
        minutes: 60,
      }),
      fill({
        side: "SELL",
        qty: 1.5,
        price: 107,
        realizedPnl: 11.5,
        commission: 0.064,
        minutes: 90,
      }),
    ],
  },
  {
    name: "한 체결로 포지션 반전 (숏 2 → 롱 1)",
    fills: [
      fill({ side: "SELL", qty: 2, price: 100, commission: 0.08, minutes: 0 }),
      fill({
        side: "BUY",
        qty: 3,
        price: 95,
        realizedPnl: 10,
        commission: 0.114,
        minutes: 20,
      }),
      fill({
        side: "SELL",
        qty: 1,
        price: 99,
        realizedPnl: 4,
        commission: 0.04,
        minutes: 40,
      }),
    ],
  },
  {
    name: "기간 이전 진입 청산 (orphan)",
    fills: [
      fill({
        side: "SELL",
        qty: 5,
        price: 120,
        realizedPnl: 42.5,
        commission: 0.24,
        minutes: 0,
      }),
      fill({ side: "BUY", qty: 1, price: 100, commission: 0.04, minutes: 10 }),
      fill({
        side: "SELL",
        qty: 1,
        price: 103,
        realizedPnl: 3,
        commission: 0.041,
        minutes: 20,
      }),
    ],
  },
  {
    name: "미청산 포지션 잔존",
    fills: [
      fill({ side: "BUY", qty: 1, price: 100, commission: 0.04, minutes: 0 }),
      fill({
        side: "SELL",
        qty: 1,
        price: 110,
        realizedPnl: 10,
        commission: 0.044,
        minutes: 10,
      }),
      fill({ side: "BUY", qty: 3, price: 108, commission: 0.13, minutes: 20 }),
    ],
  },
  {
    name: "헤지 모드 (동일 심볼 롱/숏 동시 보유)",
    fills: [
      fill({
        side: "BUY",
        qty: 1,
        price: 100,
        commission: 0.04,
        positionSide: "LONG",
        minutes: 0,
      }),
      fill({
        side: "SELL",
        qty: 1,
        price: 100,
        commission: 0.04,
        positionSide: "SHORT",
        minutes: 1,
      }),
      fill({
        side: "SELL",
        qty: 1,
        price: 110,
        realizedPnl: 10,
        commission: 0.044,
        positionSide: "LONG",
        minutes: 10,
      }),
      fill({
        side: "BUY",
        qty: 1,
        price: 110,
        realizedPnl: -10,
        commission: 0.044,
        positionSide: "SHORT",
        minutes: 11,
      }),
    ],
  },
  {
    name: "BNB 수수료 (USDT 아님)",
    fills: [
      fill({
        side: "BUY",
        qty: 1,
        price: 100,
        commission: 0.0002,
        commissionAsset: "BNB",
        minutes: 0,
      }),
      fill({
        side: "SELL",
        qty: 1,
        price: 110,
        realizedPnl: 10,
        commission: 0.00022,
        commissionAsset: "BNB",
        minutes: 10,
      }),
    ],
  },
  {
    name: "다중 심볼 혼재",
    fills: [
      fill({ symbol: "BTCUSDT", side: "BUY", qty: 1, price: 100, commission: 0.04 }),
      fill({ symbol: "ETHUSDT", side: "SELL", qty: 10, price: 20, commission: 0.08 }),
      fill({
        symbol: "BTCUSDT",
        side: "SELL",
        qty: 1,
        price: 105,
        realizedPnl: 5,
        commission: 0.042,
        minutes: 30,
      }),
      fill({
        symbol: "ETHUSDT",
        side: "BUY",
        qty: 10,
        price: 19,
        realizedPnl: 10,
        commission: 0.076,
        minutes: 40,
      }),
    ],
  },
  {
    name: "쪼개진 청산이 여러 포지션에 걸침",
    fills: [
      fill({ side: "BUY", qty: 0.3, price: 100, commission: 0.012 }),
      fill({ side: "BUY", qty: 0.3, price: 100, commission: 0.012, minutes: 1 }),
      fill({ side: "BUY", qty: 0.4, price: 100, commission: 0.016, minutes: 2 }),
      fill({
        side: "SELL",
        qty: 1,
        price: 101,
        realizedPnl: 1,
        commission: 0.0404,
        minutes: 3,
      }),
      fill({ side: "SELL", qty: 2, price: 101, commission: 0.0808, minutes: 4 }),
      fill({
        side: "BUY",
        qty: 2,
        price: 100,
        realizedPnl: 2,
        commission: 0.08,
        minutes: 5,
      }),
    ],
  },
];

const EPSILON = 1e-6;
let failures = 0;

console.log("포지션 되감기 회계 불변식 검증\n");

for (const scenario of scenarios) {
  const result = reconstructTrades(scenario.fills, new Map([["BTCUSDT", 10]]));
  const { ledger } = result;

  const pnlDistributed =
    ledger.closedRealizedPnl + ledger.orphanRealizedPnl + ledger.openRealizedPnl;
  const pnlResidual = ledger.fillsRealizedPnl - pnlDistributed;

  const feeDistributed =
    ledger.closedFeeUsdt + ledger.orphanFeeUsdt + ledger.openFeeUsdt;
  const feeResidual = ledger.fillsFeeUsdt - feeDistributed;

  const pnlOk = Math.abs(pnlResidual) < EPSILON;
  const feeOk = Math.abs(feeResidual) < EPSILON;
  if (!pnlOk || !feeOk) failures += 1;

  console.log(`${pnlOk && feeOk ? "PASS" : "FAIL"}  ${scenario.name}`);
  console.log(
    `      복기 ${result.trades.length}건 · 미청산 ${result.openPositions}건 · orphan ${result.orphanExits}건`
  );
  console.log(
    `      실현손익 총액 ${ledger.fillsRealizedPnl.toFixed(4)} = 복기 ${ledger.closedRealizedPnl.toFixed(
      4
    )} + orphan ${ledger.orphanRealizedPnl.toFixed(4)} + 미청산 ${ledger.openRealizedPnl.toFixed(
      4
    )}  (잔액 ${pnlResidual.toExponential(2)})`
  );
  console.log(
    `      USDT 수수료 총액 ${ledger.fillsFeeUsdt.toFixed(6)} = 복기 ${ledger.closedFeeUsdt.toFixed(
      6
    )} + orphan ${ledger.orphanFeeUsdt.toFixed(6)} + 미청산 ${ledger.openFeeUsdt.toFixed(
      6
    )}  (잔액 ${feeResidual.toExponential(2)})`
  );
  if (ledger.nonUsdtFees.length > 0) {
    console.log(
      `      비USDT 수수료 ${ledger.nonUsdtFees
        .map((entry) => `${entry.amount} ${entry.asset}`)
        .join(", ")}`
    );
  }
  console.log();
}

console.log(
  failures === 0
    ? `전체 ${scenarios.length}개 시나리오 통과`
    : `${failures}/${scenarios.length}개 시나리오 실패`
);
process.exit(failures === 0 ? 0 : 1);
