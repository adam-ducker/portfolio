import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import VideosList from '@/app/components/VideosList';

// /videos/:slug — a grid of MLB clips for a team slug (e.g. chicago-cubs).
export default async function VideosPage({ params }: { params: { slug: string } }) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }
  return <VideosList slug={params.slug} />;
}
