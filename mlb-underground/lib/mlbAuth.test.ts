/**
 * @jest-environment node
 */
import { parseJwt, fetchMlbTokens } from './mlbAuth';

const b64url = (obj: object) =>
  Buffer.from(JSON.stringify(obj), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
const makeJwt = (payload: object) => `header.${b64url(payload)}.signature`;

describe('parseJwt', () => {
  it('decodes the payload segment into an object', () => {
    expect(parseJwt(makeJwt({ exp: 123, sub: 'u1' }))).toEqual({ exp: 123, sub: 'u1' });
  });

  it('decodes UTF-8 characters in the payload', () => {
    expect(parseJwt(makeJwt({ name: 'José Ramírez' })).name).toBe('José Ramírez');
  });
});

describe('fetchMlbTokens', () => {
  // A helper to queue up fetch responses in order.
  const queueFetch = (responses: unknown[]) => {
    const fn = jest.fn();
    responses.forEach((body) => {
      fn.mockResolvedValueOnce({ json: async () => body });
    });
    global.fetch = fn as unknown as typeof fetch;
    return fn;
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('walks interact -> introspect -> identify -> challenge -> token', async () => {
    const fetchMock = queueFetch([
      // 1. /interact
      { interaction_handle: 'IH' },
      // 2. /introspect -> identify step
      {
        stateHandle: 'SH1',
        remediation: { value: [{ name: 'identify', href: 'https://ids.mlb.com/identify' }] },
      },
      // 3. identify -> select-authenticator step
      {
        stateHandle: 'SH2',
        remediation: {
          value: [{ name: 'select-authenticator-authenticate', href: 'https://ids.mlb.com/select' }],
        },
        authenticators: { value: [{ type: 'password', id: 'PWID' }] },
      },
      // 4. select -> challenge step
      {
        stateHandle: 'SH3',
        remediation: {
          value: [{ name: 'challenge-authenticator', href: 'https://ids.mlb.com/challenge' }],
        },
      },
      // 5. challenge -> success with interaction code
      {
        stateHandle: 'SH4',
        successWithInteractionCode: {
          value: [{ name: 'interaction_code', value: 'INTCODE' }],
        },
      },
      // 6. /token
      {
        token_type: 'Bearer',
        expires_in: 3600,
        access_token: 'ACCESS',
        scope: 'openid',
        refresh_token: 'REFRESH',
        id_token: 'ID',
      },
    ]);

    const tokens = await fetchMlbTokens('adam', 'secret');

    expect(tokens.access_token).toBe('ACCESS');
    expect(tokens.refresh_token).toBe('REFRESH');
    expect(fetchMock).toHaveBeenCalledTimes(6);

    // First call is the /interact endpoint with the client id + PKCE challenge.
    const interactUrl = fetchMock.mock.calls[0][0] as string;
    expect(interactUrl).toContain('/v1/interact');
    const interactBody = (fetchMock.mock.calls[0][1] as RequestInit).body as string;
    expect(interactBody).toContain('code_challenge=');
    expect(interactBody).toContain('code_challenge_method=S256');

    // The identify step forwards the username and the current stateHandle.
    const identifyBody = JSON.parse((fetchMock.mock.calls[2][1] as RequestInit).body as string);
    expect(identifyBody).toEqual({ identifier: 'adam', stateHandle: 'SH1' });

    // The challenge step forwards the password as the passcode.
    const challengeBody = JSON.parse((fetchMock.mock.calls[4][1] as RequestInit).body as string);
    expect(challengeBody.credentials.passcode).toBe('secret');

    // The token step exchanges the interaction code for tokens with grant_type.
    const tokenBody = (fetchMock.mock.calls[5][1] as RequestInit).body as string;
    expect(tokenBody).toContain('grant_type=interaction_code');
    expect(tokenBody).toContain('interaction_code=INTCODE');
    expect(tokenBody).toContain('code_verifier=');
  });

  it('throws when /interact returns no interaction handle', async () => {
    queueFetch([{}]);
    await expect(fetchMlbTokens('adam', 'secret')).rejects.toThrow(/interaction handle/i);
  });

  it('throws when the remediation never yields an interaction code', async () => {
    queueFetch([
      { interaction_handle: 'IH' },
      // introspect returns a step we don't handle -> loop breaks, no code
      { stateHandle: 'SH1', remediation: { value: [{ name: 'unknown-step', href: 'x' }] } },
    ]);
    await expect(fetchMlbTokens('adam', 'secret')).rejects.toThrow(/interaction code/i);
  });

  it('handles a remediation with no steps array at all', async () => {
    queueFetch([
      { interaction_handle: 'IH' },
      // No `remediation` key -> stepParams reads (undefined ?? []) -> no step.
      { stateHandle: 'SH1' },
    ]);
    await expect(fetchMlbTokens('adam', 'secret')).rejects.toThrow(/interaction code/i);
  });

  it('throws when the success block has no interaction_code entry', async () => {
    queueFetch([
      { interaction_handle: 'IH' },
      {
        stateHandle: 'SH',
        // success block present, but the named value isn't there -> find() -> '' .
        successWithInteractionCode: { value: [{ name: 'something_else', value: 'x' }] },
      },
    ]);
    await expect(fetchMlbTokens('adam', 'secret')).rejects.toThrow(/interaction code/i);
  });

  it('throws when /token returns no access token', async () => {
    queueFetch([
      { interaction_handle: 'IH' },
      {
        stateHandle: 'SH',
        successWithInteractionCode: { value: [{ name: 'interaction_code', value: 'INTCODE' }] },
      },
      { token_type: 'Bearer' }, // no access_token
    ]);
    await expect(fetchMlbTokens('adam', 'secret')).rejects.toThrow(/access token/i);
  });
});
