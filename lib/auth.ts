import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "norbee_session";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const JWT_EXPIRES = "7d";

export type SessionUser = {
  userId: string;
  companyId: string;
  cantinaId?: string | null;
  role: "ADMIN" | "EMPLOYEE";
  identifier: string;
};

export async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export function signSession(payload: SessionUser) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export function verifySession(token: string) {
  return jwt.verify(token, JWT_SECRET) as SessionUser & {
    iat: number;
    exp: number;
  };
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return null;

  try {
    return verifySession(token);
  } catch {
    return null;
  }
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (session.role !== "ADMIN") throw new Error("UNAUTHORIZED");
  return session;
}

export async function requireCantinaEmployee() {
  const session = await requireAuth();

  if (session.role !== "EMPLOYEE" || !session.cantinaId) {
    throw new Error("UNAUTHORIZED");
  }

  return session;
}