import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getSession } from '@/lib/auth';
import { getConfig } from '@/lib/config';

// Replaces the PHP /auth endpoint. Persists the MLB token bundle the client
// obtained from the Okta flow, into tmp_dir/tokens.json (same as the PHP app).
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.text();

  // Validate it's JSON before writing.
  try {
    JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Invalid token payload' }, { status: 400 });
  }

  try {
    const config = getConfig();
    fs.writeFileSync(path.join(config.tmp_dir, 'tokens.json'), body);
  } catch {
    return NextResponse.json({ error: 'Could not store tokens' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
