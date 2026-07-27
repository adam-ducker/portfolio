import Link from 'next/link';
import { Game } from '@/lib/types';

type MediaProps = {
  game: Game;
  feedType: string;
};

// Ported from the React app's Media component. The /videos and /player routes
// don't exist yet in this app, so these render as (currently dead) links.
const Media = ({ game, feedType }: MediaProps) => {
  const feeds = game.feeds
    .filter((feed) => feed.feedType === feedType)
    .sort((a, b) => (a.location < b.location ? -1 : a.location > b.location ? 1 : 0))
    .map((feed) => (
      <div className="media" key={feed.mediaId}>
        {feed.feedType === 'Clips' && (
          <Link href={`/videos/${feed.mediaId}`}>
            <div
              className="logo"
              style={{ backgroundImage: `url(//www.mlbstatic.com/team-logos/${feed.teamId}.svg)` }}
            />
            More Video
          </Link>
        )}
        {feed.feedType !== 'Clips' && (
          <Link href={`/player/${game.gameId}/${feed.feedType.toLowerCase()}/${feed.mediaId}`}>
            <div
              className="logo"
              style={{ backgroundImage: `url(//www.mlbstatic.com/team-logos/${feed.teamId}.svg)` }}
            />
            {feed.callLetters}
          </Link>
        )}
      </div>
    ));

  return <div className="medias">{feeds}</div>;
};

export default Media;
