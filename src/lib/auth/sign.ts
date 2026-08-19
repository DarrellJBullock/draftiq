import { createHmac, timingSafeEqual } from "node:crypto";

const SECRET = process.env.DEMO_AUTH_SECRET || "insecure-dev-secret-change-me";

/** Signs a plain string payload, returning `base64(payload).base64(hmac)`. */
export function signValue(payload: string): string {
  const encoded = Buffer.from(payload, "utf8").toString("base64url");
  const signature = createHmac("sha256", SECRET).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

/** Verifies and decodes a value produced by {@link signValue}. Returns null if invalid. */
export function verifyValue(token: string | undefined | null): string | null {
  if (!token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = createHmac("sha256", SECRET).update(encoded).digest("base64url");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    return Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return null;
  }
}
