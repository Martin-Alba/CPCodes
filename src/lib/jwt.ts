import { SignJWT, jwtVerify } from "jose";

// Módulo seguro para edge (lo usa el middleware) y para Node.
// NO importa next/headers ni "server-only".
export const COOKIE_NAME = "cp_session";
export const SESSION_MAX_AGE = 60 * 60 * 8; // 8 horas en segundos

export type Role = "admin" | "viewer";

export interface SessionPayload {
  sub: string;
  name: string;
  role: Role;
}

const ALG = "HS256";

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET no está configurada");
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ name: payload.name, role: payload.role })
    .setProtectedHeader({ alg: ALG })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const role: Role = payload.role === "admin" ? "admin" : "viewer";
    return { sub: String(payload.sub ?? ""), name: String(payload.name ?? ""), role };
  } catch {
    return null;
  }
}
