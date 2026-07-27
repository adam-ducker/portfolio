import { redirect } from 'next/navigation';
import { isAuthorized } from '@/lib/auth';
import Player from '@/app/components/Player';

// Gates the player behind login when site auth is on (server), then hands off
// to the client Player. With auth off the page is open.
export default async function PlayerPage({
  params,
}: {
  params: { gameId: string; feedType: string; mediaId: string };
}) {
  if (!(await isAuthorized())) {
    redirect('/login');
  }

  return <Player gameId={params.gameId} feedType={params.feedType} mediaId={params.mediaId} />;
}
