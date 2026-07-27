import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import VideoView from '@/app/components/VideoView';

// /video/:keywords/:slug — play one clip + a "more from :keywords" sidebar.
export default async function VideoPage({
  params,
}: {
  params: { keywords: string; slug: string };
}) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }
  return <VideoView keywords={params.keywords} slug={params.slug} />;
}
