import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';
import { isAuthorized } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { fetchMlbTokens, parseJwt, MlbTokens } from '@/lib/mlbAuth';

// Ensures a fresh MLB access token exists server-side, running the Okta flow
// with the config credentials if needed. Returns the {title,status} the nav's
// status dot shows. The MLB password never leaves the server.

const emptyTokens: MlbTokens = {
  token_type: '',
  expires_in: 0,
  access_token: '',
  scope: '',
  refresh_token: '',
  id_token: '',
};

function tokensFile(tmpDir: string) {
  return path.join(tmpDir, 'tokens.json');
}

function readTokens(tmpDir: string): MlbTokens {
  try {
    const raw = fs.readFileSync(tokensFile(tmpDir), 'utf8');
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // fall through
  }
  return emptyTokens;
}

function writeTokens(tmpDir: string, tokens: MlbTokens) {
  fs.writeFileSync(tokensFile(tmpDir), JSON.stringify(tokens));
}

function expiryTitle(accessToken: string): string {
  try {
    const jwt = parseJwt(accessToken);
    if (jwt.exp) {
      return 'Expires: ' + format(new Date(jwt.exp * 1000), 'yyyy-MM-dd h:mm aa');
    }
  } catch {
    // ignore
  }
  return '';
}

function isValid(accessToken: string): boolean {
  if (!accessToken) {
    return false;
  }
  try {
    const jwt = parseJwt(accessToken);
    return !!jwt.exp && jwt.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export async function POST() {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const config = getConfig();

  // Already have a valid token — nothing to do.
  const current = readTokens(config.tmp_dir);
  if (isValid(current.access_token)) {
    return NextResponse.json({ title: expiryTitle(current.access_token), status: 'success' });
  }

  if (!config.mlb_username || !config.mlb_password) {
    return NextResponse.json({ title: '', status: 'error', message: 'No MLB credentials configured' });
  }

  try {
    const tokens = await fetchMlbTokens(config.mlb_username, config.mlb_password);
    writeTokens(config.tmp_dir, tokens);
    return NextResponse.json({ title: expiryTitle(tokens.access_token), status: 'success' });
  } catch {
    return NextResponse.json({ title: '', status: 'error', message: 'MLB sign-in failed' });
  }
}
