// PKCE (Proof Key for Code Exchange) helpers — RFC 7636. Ported from the React
// app. Uses the browser Web Crypto API, so these run client-side.

const base64UrlEncode = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window
    .btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

const randomUrlSafeString = (byteLength: number): string => {
  if (byteLength < 1) {
    throw new RangeError('byteLength must be at least 1');
  }
  const randomValues = new Uint8Array(byteLength);
  window.crypto.getRandomValues(randomValues);
  return base64UrlEncode(randomValues.buffer);
};

export const generateCodeVerifier = (length: number = 64): string => {
  if (length < 43 || length > 128) {
    throw new RangeError('PKCE code verifier length must be between 43 and 128 characters');
  }
  const byteLength = Math.ceil((length * 3) / 4);
  return randomUrlSafeString(byteLength).slice(0, length);
};

export const generateCodeChallenge = async (verifier: string): Promise<string> => {
  const data = new TextEncoder().encode(verifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(digest);
};

export const generateState = (byteLength: number = 32): string => randomUrlSafeString(byteLength);

export const generateNonce = (byteLength: number = 32): string => randomUrlSafeString(byteLength);
