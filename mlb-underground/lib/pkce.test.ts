import { webcrypto } from 'crypto';
import { TextEncoder } from 'util';
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  generateNonce,
} from './pkce';

// jsdom (16.x, via jest 27) doesn't implement window.crypto or a global
// TextEncoder, both of which exist in real browsers. Back them with Node's
// implementations for these tests.
beforeAll(() => {
  if (!(window as unknown as { crypto?: Crypto }).crypto?.subtle) {
    Object.defineProperty(window, 'crypto', {
      value: webcrypto,
      configurable: true,
    });
  }
  if (typeof (global as { TextEncoder?: unknown }).TextEncoder === 'undefined') {
    (global as { TextEncoder?: unknown }).TextEncoder = TextEncoder;
  }
});

const URL_SAFE = /^[A-Za-z0-9\-_]+$/;

describe('generateCodeVerifier', () => {
  it('defaults to a 64-character verifier', () => {
    expect(generateCodeVerifier()).toHaveLength(64);
  });

  it('honors a custom length within the RFC bounds', () => {
    expect(generateCodeVerifier(43)).toHaveLength(43);
    expect(generateCodeVerifier(100)).toHaveLength(100);
    expect(generateCodeVerifier(128)).toHaveLength(128);
  });

  it('only contains URL-safe characters', () => {
    expect(generateCodeVerifier(128)).toMatch(URL_SAFE);
  });

  it('produces a different value on each call', () => {
    expect(generateCodeVerifier()).not.toBe(generateCodeVerifier());
  });

  it('rejects lengths outside 43–128 (RFC 7636 §4.1)', () => {
    expect(() => generateCodeVerifier(42)).toThrow(RangeError);
    expect(() => generateCodeVerifier(129)).toThrow(RangeError);
  });
});

describe('generateCodeChallenge', () => {
  it('matches the RFC 7636 Appendix B test vector', async () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    await expect(generateCodeChallenge(verifier)).resolves.toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'
    );
  });

  it('is a 43-char url-safe string with no padding (SHA-256 -> base64url)', async () => {
    const challenge = await generateCodeChallenge(generateCodeVerifier());
    expect(challenge).toHaveLength(43);
    expect(challenge).toMatch(URL_SAFE);
    expect(challenge).not.toContain('=');
  });

  it('is deterministic for a given verifier', async () => {
    const verifier = generateCodeVerifier();
    const first = await generateCodeChallenge(verifier);
    const second = await generateCodeChallenge(verifier);
    expect(first).toBe(second);
  });
});

describe('generateState / generateNonce', () => {
  it('default to 43-char url-safe strings (32 random bytes -> base64url)', () => {
    expect(generateState()).toHaveLength(43);
    expect(generateNonce()).toHaveLength(43);
    expect(generateState()).toMatch(URL_SAFE);
    expect(generateNonce()).toMatch(URL_SAFE);
  });

  it('vary on each call', () => {
    expect(generateState()).not.toBe(generateState());
    expect(generateNonce()).not.toBe(generateNonce());
  });

  it('reject a byteLength below 1', () => {
    expect(() => generateState(0)).toThrow(RangeError);
    expect(() => generateNonce(0)).toThrow(RangeError);
  });
});
