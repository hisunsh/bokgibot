export type PositionSide = "LONG" | "SHORT";

/** 청산까지 완료된 단일 포지션(복기 단위) */
export type Trade = {
  id: string;
  /** ISO 8601 (KST 기준으로 표기) */
  closedAt: string;
  symbol: string;
  side: PositionSide;
  leverage: number;
  entryPrice: number;
  exitPrice: number;
  /** 수수료 차감 후 실현 손익 (USDT) */
  netPnl: number;
  /** 증거금 기준 손익률 (%) */
  pnlPercent: number;
  /** 진입 + 청산 수수료 합계 (양수로 저장, 표기 시 음수) */
  fee: number;
  /** 복기용 전략 태그. 예: #웻지돌파 */
  tags: string[];
  memo?: string;
};

/** 일별 누적 손익 곡선의 한 점 */
export type EquityPoint = {
  /** MM-DD */
  date: string;
  /** 해당일 실현 손익 */
  dailyPnl: number;
  /** 기간 시작부터의 누적 실현 손익 */
  cumulativePnl: number;
};

export type PerformanceSummary = {
  netPnl: number;
  /** 전주 대비 순손익 증감율 (%) */
  netPnlChangePercent: number;
  winRate: number;
  wins: number;
  losses: number;
  /** 총이익 ÷ 총손실. 손실 거래가 없어 무한대인 경우 null. (JSON 에 Infinity 를 담을 수 없다) */
  profitFactor: number | null;
  /** 손익비 전주 대비 증감 (배수) */
  profitFactorChange: number;
  totalFees: number;
  /** 총 손익 규모(총이익 + 총손실) 대비 수수료 비중 (%) */
  feeRatio: number;
};

export type ReferralStatus = {
  /** 이번 달 누적 레퍼럴 거래량 (USDT) */
  currentVolume: number;
  /** VIP 무료 이용 기준 거래량 (USDT) */
  requiredVolume: number;
  /** 정산까지 남은 일수 */
  daysLeft: number;
};

/** 전략 태그별 성과 집계 */
export type TagPerformance = {
  tag: string;
  pnl: number;
  count: number;
};

/** API 키에 실제로 부여된 권한. 출금 권한 차단 여부를 판단하는 근거가 된다. */
export type KeyPermissions = {
  canRead: boolean;
  canTradeFutures: boolean;
  canWithdraw: boolean;
  canTradeSpot: boolean;
  ipRestricted: boolean;
};

/**
 * 대시보드가 렌더링에 필요한 모든 데이터의 단일 묶음.
 * 더미 데이터와 바이낸스 실데이터가 동일한 규격을 공유하므로
 * 프론트엔드는 출처를 신경 쓰지 않고 이 타입만 바라본다.
 */
export type DashboardSnapshot = {
  source: "mock" | "binance";
  /** 스냅샷 생성 시각 (ISO 8601) */
  syncedAt: string;
  /** 조회한 기간 (일) */
  lookbackDays: number;
  summary: PerformanceSummary;
  equityCurve: EquityPoint[];
  trades: Trade[];
  tagPerformance: TagPerformance[];
  /** 기간 내 총 체결 명목 거래량 (USDT). 레퍼럴 달성률 계산에 사용. */
  tradedVolume: number;
  /** 조회한 심볼 목록 */
  symbols: string[];
  /** 아직 청산되지 않아 복기 대상에서 제외한 포지션 수 */
  openPositions: number;
  /** 데이터 해석 시 알아야 할 주의사항 (레버리지 추정, BNB 수수료 등) */
  notes: string[];
  permissions?: KeyPermissions;
};

export type SyncErrorCode =
  | "UNAUTHORIZED"
  | "NO_CREDENTIALS"
  | "INVALID_BODY"
  | "INVALID_KEY"
  | "WITHDRAW_PERMISSION"
  | "NO_FUTURES_PERMISSION"
  | "IP_RESTRICTED"
  | "RATE_LIMITED"
  | "UPSTREAM_ERROR"
  | "NETWORK_ERROR";

export type SyncResponse =
  | { ok: true; snapshot: DashboardSnapshot }
  | { ok: false; error: { code: SyncErrorCode; message: string } };

/** 등록된 자격 증명의 공개 가능한 메타데이터. 키 자체는 절대 포함하지 않는다. */
export type CredentialStatus = {
  connected: boolean;
  /** 마스킹된 힌트. 예: "4f8b••••9e1a" */
  apiKeyHint?: string;
  registeredAt?: string;
  permissions?: KeyPermissions;
};
