import { parseJwt } from './api';

// api.ts's parseJwt uses window.atob, so it runs under the default jsdom env.
// Encode payloads as base64url UTF-8, matching a real JWT's middle segment.
const b64url = (obj: object) =>
  Buffer.from(JSON.stringify(obj), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
const makeJwt = (payload: object) => `header.${b64url(payload)}.signature`;

describe('parseJwt', () => {
  it('decodes the payload segment into an object', () => {
    expect(parseJwt(makeJwt({ exp: 1712345678, sub: 'user-123', scope: 'openid' }))).toEqual({
      exp: 1712345678,
      sub: 'user-123',
      scope: 'openid',
    });
  });

  it('exposes the exp claim as a number', () => {
    expect(parseJwt(makeJwt({ exp: 1712345678 })).exp).toBe(1712345678);
  });

  it('decodes UTF-8 characters in the payload', () => {
    expect(parseJwt(makeJwt({ name: 'José Ramírez' })).name).toBe('José Ramírez');
  });
});
