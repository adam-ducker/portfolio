import { NextResponse } from 'next/server';
import { isAuthorized } from '@/lib/auth';
import { getClip } from '@/lib/videos';

export async function GET(request: Request) {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug') || '';

  try {
    const clip = await getClip(slug);
    if (!clip) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(clip);
  } catch {
    return NextResponse.json({ error: 'Bad gateway' }, { status: 502 });
  }
}
