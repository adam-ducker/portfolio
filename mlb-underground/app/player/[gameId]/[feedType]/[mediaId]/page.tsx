import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import Player from '@/app/components/Player';

// Gates the player behind login (server), then hands off to the client Player.
export default async function PlayerPage({
  params,
}: {
  params: { gameId: string; feedType: string; mediaId: string };
}) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  return <Player gameId={params.gameId} feedType={params.feedType} mediaId={params.mediaId} />;
}
