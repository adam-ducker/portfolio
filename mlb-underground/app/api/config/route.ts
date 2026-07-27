import { NextResponse } from 'next/server';

// Deprecated. The MLB config (including credentials) used to be served to the
// browser here so the client could run the Okta flow. That flow is now
// server-side (lib/mlbAuth.ts + /api/mlb/refresh), so the credentials never
// leave the server and this endpoint is no longer used.
export async function GET() {
  return NextResponse.json({ error: 'Gone' }, { status: 410 });
}
