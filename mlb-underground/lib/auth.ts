import crypto from 'crypto';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { getConfig } from './config';

export const SESSION_COOKIE = 'mlbu_session';

export type SessionUser = {
  id: string;
  username: string;
};

// Site login is opt-in. When auth is disabled (the default), the whole site is
// open and no session is required — the MLB.com token flow is unaffected.
export const authEnabled = (): boolean => getConfig().auth_enabled === true;

// Same scheme as the PHP hash_password(), so existing .config hashes work as-is.
const sha1 = (value: string) => crypto.createHash('sha1').update(value).digest('hex');
export const hashPassword = (password: string) => sha1('salty-salt' + sha1(password));

// Check a username/password against config.json. Returns the user (without the
// password) on success, or null.
export function verifyCredentials(username: string, password: string): SessionUser | null {
  const hashed = hashPassword(password);
  const user = getConfig().users.find((u) => u.username === username && u.password === hashed);
  return user ? { id: user.id, username: user.username } : null;
}

const secretKey = () =>
  new TextEncoder().encode(process.env.AUTH_SECRET || 'dev-insecure-mlb-underground-secret');

// Sign the session as a short JWT stored in an httpOnly cookie — the
// self-contained equivalent of the PHP accessToken.
export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ id: user.id, username: user.username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey());
}

export async function getSession(): Promise<SessionUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.id === 'string' && typeof payload.username === 'string') {
      return { id: payload.id, username: payload.username };
    }
    return null;
  } catch {
    return null;
  }
}

// Whether the current request may see gated content. Always true when site auth
// is disabled; otherwise requires a valid session. Use this instead of
// getSession() at the gates so the flag toggles the whole site.
export async function isAuthorized(): Promise<boolean> {
  if (!authEnabled()) {
    return true;
  }
  return !!(await getSession());
}
