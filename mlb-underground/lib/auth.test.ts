/**
 * @jest-environment node
 */
import { hashPassword, verifyCredentials, createSessionToken, getSession, SESSION_COOKIE } from './auth';

// Mock the config module so verifyCredentials has a known user list.
jest.mock('./config', () => ({
  getConfig: jest.fn(),
}));
import { getConfig } from './config';

// A controllable cookie store standing in for next/headers cookies().
const cookieStore: { value: string | undefined } = { value: undefined };
jest.mock('next/headers', () => ({
  cookies: () => ({
    get: (name: string) =>
      name === 'mlbu_session' && cookieStore.value !== undefined
        ? { value: cookieStore.value }
        : undefined,
  }),
}));

const mockedGetConfig = getConfig as jest.Mock;

// sha1('salty-salt' + sha1('changeme')) — the seeded first-run hash.
const CHANGEME_HASH = '168136e6ee7f7dd54bbd6df5a79c223387b47ad6';

beforeEach(() => {
  cookieStore.value = undefined;
  mockedGetConfig.mockReset();
  // Pin the signing secret to the known dev default so both sides of the
  // round-trip agree regardless of the ambient environment.
  delete process.env.AUTH_SECRET;
});

describe('SESSION_COOKIE', () => {
  it('is the shared session cookie name', () => {
    expect(SESSION_COOKIE).toBe('mlbu_session');
  });
});

describe('hashPassword', () => {
  it('matches the PHP sha1(salty-salt . sha1(pw)) scheme', () => {
    expect(hashPassword('changeme')).toBe(CHANGEME_HASH);
  });

  it('is deterministic and differs per password', () => {
    expect(hashPassword('abc')).toBe(hashPassword('abc'));
    expect(hashPassword('abc')).not.toBe(hashPassword('abd'));
  });
});

describe('verifyCredentials', () => {
  beforeEach(() => {
    mockedGetConfig.mockReturnValue({
      users: [{ id: '7', username: 'adam', password: CHANGEME_HASH }],
      mlb_username: '',
      mlb_password: '',
      tmp_dir: '',
    });
  });

  it('returns the user (without the password) for a correct password', () => {
    expect(verifyCredentials('adam', 'changeme')).toEqual({ id: '7', username: 'adam' });
  });

  it('returns null for a wrong password', () => {
    expect(verifyCredentials('adam', 'nope')).toBeNull();
  });

  it('returns null for an unknown username', () => {
    expect(verifyCredentials('ghost', 'changeme')).toBeNull();
  });
});

describe('session token round-trip', () => {
  const user = { id: '7', username: 'adam' };

  it('signs a token that getSession can read back', async () => {
    const token = await createSessionToken(user);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // header.payload.signature

    cookieStore.value = token;
    await expect(getSession()).resolves.toEqual(user);
  });

  it('returns null when there is no session cookie', async () => {
    cookieStore.value = undefined;
    await expect(getSession()).resolves.toBeNull();
  });

  it('returns null for a tampered / invalid token', async () => {
    cookieStore.value = 'not.a.jwt';
    await expect(getSession()).resolves.toBeNull();
  });

  it('returns null when a validly-signed token lacks id/username claims', async () => {
    // Sign a token with the same secret but the wrong shape.
    const { SignJWT } = await import('jose');
    const secret = new TextEncoder().encode('dev-insecure-mlb-underground-secret');
    cookieStore.value = await new SignJWT({ foo: 'bar' })
      .setProtectedHeader({ alg: 'HS256' })
      .sign(secret);
    await expect(getSession()).resolves.toBeNull();
  });
});
