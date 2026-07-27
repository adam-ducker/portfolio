import crypto from 'crypto';

// Server-side MLB Okta (Identity Engine) auth. This is the interaction-code /
// PKCE flow that used to run in the browser (MLBContext), moved server-side so
// the MLB password never reaches the client and there's no CORS to worry about.
// We still send mlb.com-style Origin/Referer/UA headers to mimic the real login.

const CLIENT_ID = '0oap7wa857jcvPlZ5355';
const REDIRECT_URI = 'https://www.mlb.com/login';
const AUTH_SERVER = 'https://ids.mlb.com/oauth2/aus1m088yK07noBfh356';
const TOKEN_URL = `${AUTH_SERVER}/v1/token`;
const INTERACT_URL = `${AUTH_SERVER}/v1/interact`;
const INTROSPECT_URL = 'https://ids.mlb.com/idp/idx/introspect';

const BROWSER_HEADERS = {
  Origin: 'https://www.mlb.com',
  Referer: 'https://www.mlb.com/',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
};

const FORM_HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
  Accept: 'application/json; charset=UTF-8',
  'Accept-Language': 'en-US,en;q=0.9',
  ...BROWSER_HEADERS,
};

const INTROSPECT_HEADERS = {
  'Content-Type': 'application/ion+json; okta-version=1.0.0',
  Accept: 'application/json; charset=UTF-8',
  'Accept-Language': 'en-US,en;q=0.9',
  ...BROWSER_HEADERS,
};

const REMEDIATION_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json; okta-version=1.0.0',
  'Accept-Language': 'en',
  ...BROWSER_HEADERS,
};

// ---- PKCE / random (node crypto) ----

const base64Url = (buf: Buffer) =>
  buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const codeVerifier = () => base64Url(crypto.randomBytes(48)).slice(0, 64);
const codeChallenge = (verifier: string) =>
  base64Url(crypto.createHash('sha256').update(verifier).digest());
const randomUrlSafe = (bytes = 32) => base64Url(crypto.randomBytes(bytes));

// ---- token shape ----

export interface MlbTokens {
  token_type: string;
  expires_in: number;
  access_token: string;
  scope: string;
  refresh_token: string;
  id_token: string;
}

export interface JwtPayload {
  exp?: number;
  [claim: string]: unknown;
}

export const parseJwt = (token: string): JwtPayload => {
  const payload = token.split('.')[1];
  const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  return JSON.parse(json);
};

// ---- IDX remediation types ----

interface Remediation {
  stateHandle: string;
  remediation?: { value: { name: string; href: string }[] };
  authenticators?: { value: { type: string; id: string }[] };
  successWithInteractionCode?: { value: { name: string; value: string }[] };
}

async function postJson<T>(url: string, headers: Record<string, string>, body: string): Promise<T> {
  const res = await fetch(url, { method: 'POST', headers, body, cache: 'no-store' });
  return (await res.json()) as T;
}

// Build the params object for a given remediation step (identify / password
// select / passcode), or return null for a step we don't handle.
function stepParams(
  remediation: Remediation,
  username: string,
  password: string
): { href: string; body: unknown } | null {
  const steps = remediation.remediation?.value ?? [];
  for (const step of steps) {
    if (step.name === 'identify') {
      return { href: step.href, body: { identifier: username, stateHandle: remediation.stateHandle } };
    }
    if (step.name === 'challenge-authenticator') {
      return {
        href: step.href,
        body: { credentials: { passcode: password }, stateHandle: remediation.stateHandle },
      };
    }
    if (step.name === 'select-authenticator-authenticate') {
      const id = remediation.authenticators?.value?.find((a) => a.type === 'password')?.id;
      return { href: step.href, body: { authenticator: { id }, stateHandle: remediation.stateHandle } };
    }
  }
  return null;
}

// Run the full flow and return the token bundle. Throws on failure.
export async function fetchMlbTokens(username: string, password: string): Promise<MlbTokens> {
  const verifier = codeVerifier();
  const challenge = codeChallenge(verifier);

  // 1. /interact -> interaction handle
  const interactBody =
    'client_id=' +
    CLIENT_ID +
    '&scope=' +
    encodeURIComponent('openid email') +
    '&redirect_uri=' +
    encodeURIComponent(REDIRECT_URI) +
    '&code_challenge=' +
    challenge +
    '&code_challenge_method=S256' +
    '&state=' +
    randomUrlSafe() +
    '&nonce=' +
    randomUrlSafe();

  const interact = await postJson<{ interaction_handle?: string }>(INTERACT_URL, FORM_HEADERS, interactBody);
  if (!interact.interaction_handle) {
    throw new Error('No interaction handle from /interact');
  }

  // 2. /introspect -> first remediation + state handle
  let remediation = await postJson<Remediation>(
    INTROSPECT_URL,
    INTROSPECT_HEADERS,
    JSON.stringify({ interactionHandle: interact.interaction_handle })
  );

  // 3. walk the remediation steps until we get an interaction code
  let interactionCode = '';
  for (let i = 0; i < 6; i++) {
    if (remediation.successWithInteractionCode) {
      interactionCode =
        remediation.successWithInteractionCode.value.find((v) => v.name === 'interaction_code')?.value || '';
      break;
    }
    const next = stepParams(remediation, username, password);
    if (!next) {
      break;
    }
    remediation = await postJson<Remediation>(next.href, REMEDIATION_HEADERS, JSON.stringify(next.body));
  }

  if (!interactionCode) {
    throw new Error('Remediation did not yield an interaction code');
  }

  // 4. /token -> tokens
  const tokenBody =
    'client_id=' +
    CLIENT_ID +
    '&grant_type=interaction_code' +
    '&scope=openid+profile+email+offline_access+web_session' +
    '&interaction_code=' +
    interactionCode +
    '&code_verifier=' +
    verifier;

  const tokens = await postJson<MlbTokens>(TOKEN_URL, FORM_HEADERS, tokenBody);
  if (!tokens.access_token) {
    throw new Error('No access token from /token');
  }

  return tokens;
}
