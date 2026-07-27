// Client-side helpers. parseJwt decodes a JWT payload (uses window.atob, so
// client-only). Ported from the React app's lib/api.ts.

export interface JwtPayload {
  exp?: number;
  [claim: string]: unknown;
}

export const parseJwt = (token: string): JwtPayload => {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    window
      .atob(base64)
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );

  return JSON.parse(jsonPayload);
};
