import { NextResponse } from 'next/server';
import { isAuthorized } from '@/lib/auth';
import { searchVideos } from '@/lib/videos';

export async function GET(request: Request) {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '0', 10);
  const limit = parseInt(searchParams.get('limit') || '100', 10);

  try {
    const videos = await searchVideos(q, page, limit);
    return NextResponse.json({ videos });
  } catch {
    return NextResponse.json({ videos: [] }, { status: 502 });
  }
}
