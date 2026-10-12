import { SignJWT, jwtVerify } from "jose";
import { SESSION_MAX_AGE_SECONDS } from "./constants";

// Edge-safe: jose uses Web Crypto, so this file works in middleware too.

const ISSUER = "ai-knowledge-assistant";
const ALGORITHM = "HS256";

export type SessionPayload = {
  userId: string;
  sessionVersion: number;
};

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET is missing or shorter than 32 characters. See .env.example.",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ sv: payload.sessionVersion })
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(payload.userId)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecret());
}

/** Returns the payload if the token is authentic and unexpired, otherwise null. */
export async function verifySessionToken(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: ISSUER,
      algorithms: [ALGORITHM],
    });
    if (typeof payload.sub !== "string" || typeof payload.sv !== "number") {
      return null;
    }
    return { userId: payload.sub, sessionVersion: payload.sv };
  } catch {
    // Bad signature, expired, malformed: all mean "not signed in".
    return null;
  }
}
