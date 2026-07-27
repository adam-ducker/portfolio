import { redirect } from 'next/navigation';
import { isAuthorized } from '@/lib/auth';
import VideoView from '@/app/components/VideoView';

// /video/:keywords/:slug — play one clip + a "more from :keywords" sidebar.
export default async function VideoPage({
  params,
}: {
  params: { keywords: string; slug: string };
}) {
  if (!(await isAuthorized())) {
    redirect('/login');
  }
  return <VideoView keywords={params.keywords} slug={params.slug} />;
}
