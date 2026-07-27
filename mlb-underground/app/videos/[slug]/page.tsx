import { redirect } from 'next/navigation';
import { isAuthorized } from '@/lib/auth';
import VideosList from '@/app/components/VideosList';

// /videos/:slug — a grid of MLB clips for a team slug (e.g. chicago-cubs).
export default async function VideosPage({ params }: { params: { slug: string } }) {
  if (!(await isAuthorized())) {
    redirect('/login');
  }
  return <VideosList slug={params.slug} />;
}
