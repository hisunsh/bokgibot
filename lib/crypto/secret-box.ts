import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

/**
 * 거래소 API 키를 DB에 저장하기 전 봉인(seal)하는 모듈.
 *
 * AES-256-GCM 을 쓰기 때문에 기밀성과 무결성을 동시에 얻는다. 추가로 userId 를
 * AAD(Additional Authenticated Data)로 묶어, 공격자가 DB 를 조작해 다른 사용자의
 * 암호문을 자기 행에 붙여넣는 것도 복호화 단계에서 실패하도록 만든다.
 *
 * 한계를 분명히 알아둘 것: 마스터 키가 환경변수에 있으므로 서버와 DB 가 동시에
 * 털리면 모든 키가 노출된다. 운영 환경에서는 이 마스터 키를 KMS/Secrets Manager 로
 * 옮기고 주기적으로 회전시켜야 한다.
 */

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const VERSION = "v1";

const ENV_KEY_NAME = "BOKGIBOT_ENCRYPTION_KEY";

let cachedKey: Buffer | null = null;

/**
 * 마스터 키를 환경변수에서 읽는다.
 * 키가 없거나 길이가 틀리면 조용히 넘어가지 않고 즉시 실패시킨다.
 * 약한 키로 사용자의 거래소 자격 증명을 암호화하는 것이 최악이기 때문이다.
 */
function getMasterKey(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = process.env[ENV_KEY_NAME];
  if (!raw) {
    throw new Error(
      `${ENV_KEY_NAME} 환경변수가 없습니다. \`openssl rand -base64 32\` 로 생성해 .env.local 에 넣어 주세요.`
    );
  }

  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `${ENV_KEY_NAME} 는 base64 로 인코딩된 32바이트 키여야 합니다. (현재 ${key.length}바이트)`
    );
  }

  cachedKey = key;
  return key;
}

/** 서버 부팅 시점에 설정 오류를 미리 잡기 위한 검사 */
export function assertEncryptionKeyConfigured() {
  getMasterKey();
}

/** 평문을 "v1.iv.tag.ciphertext" 형태의 base64url 문자열로 봉인한다. */
export function seal(plaintext: string, aad: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getMasterKey(), iv);
  cipher.setAAD(Buffer.from(aad, "utf8"));

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  return [
    VERSION,
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

/**
 * 봉인된 문자열을 복호화한다.
 * 인증 태그나 AAD 가 맞지 않으면 예외를 던진다(위조된 데이터로 판단).
 */
export function open(sealed: string, aad: string): string {
  const parts = sealed.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("암호화된 자격 증명 형식이 올바르지 않습니다.");
  }

  const iv = Buffer.from(parts[1], "base64url");
  const tag = Buffer.from(parts[2], "base64url");
  const ciphertext = Buffer.from(parts[3], "base64url");

  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
    throw new Error("암호화된 자격 증명이 손상되었습니다.");
  }

  const decipher = createDecipheriv(ALGORITHM, getMasterKey(), iv);
  decipher.setAAD(Buffer.from(aad, "utf8"));
  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

/**
 * 저장된 키가 사용자가 방금 입력한 키와 같은지 확인할 때 쓴다.
 * 길이가 다르면 timingSafeEqual 이 던지므로 먼저 걸러낸다.
 */
export function secretEquals(a: string, b: string) {
  const bufferA = Buffer.from(a, "utf8");
  const bufferB = Buffer.from(b, "utf8");
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

/** 화면에 보여줄 마스킹된 힌트. 예: "4f8b••••9e1a" */
export function keyHint(apiKey: string) {
  if (apiKey.length <= 8) return "••••";
  return `${apiKey.slice(0, 4)}••••${apiKey.slice(-4)}`;
}
