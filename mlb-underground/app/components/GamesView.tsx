import { format, addDays } from 'date-fns';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isAuthorized } from '@/lib/auth';
import { gamesData, sortGames } from '@/lib/stats';
import { GamesJson } from '@/lib/types';
import GameCard from './GameCard';

// The server's local timezone (from the OS / TZ env). Used both to pick which
// day counts as "today" and to tell the schedule API which zone to sort/show
// game times in, so the day rolls over at local midnight instead of US Eastern.
const localTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

// "Today" as yyyy-MM-dd in the server's local timezone.
const localToday = () => new Date().toLocaleDateString('en-CA');

const scheduleUrl = (date: string) =>
  'https://statsapi.mlb.com/api/v1/schedule?language=&sportId=1&date=' +
  date +
  '&timeZone=' + localTimeZone() + '&sortBy=gameDate' +
  '&hydrate=game(content(summary,media(epg))),broadcasts,linescore(matchup,runners),flags,team,review,person,stats,probablePitcher,decisions';

async function fetchGames(date: string) {
  const res = await fetch(scheduleUrl(date), { cache: 'no-store' });
  if (!res.ok) {
    return [];
  }
  const json = (await res.json()) as GamesJson;
  return sortGames(gamesData(json));
}

type GamesViewProps = {
  date?: string; // yyyy-MM-dd; defaults to today (server-local)
};

const GamesView = async ({ date }: GamesViewProps) => {
  // Gated only when site auth is enabled (like the React app's PrivateRoutes);
  // with auth off, isAuthorized() is always true and the view is open.
  if (!(await isAuthorized())) {
    redirect('/login');
  }

  const searchDate = date ?? localToday();
  // Parse at noon so timezone offsets can't shift the displayed day.
  const current = new Date(searchDate + 'T12:00:00');

  const showCurrentDate = format(current, 'EEEE MMMM do yyyy');
  const nextDate = format(addDays(current, 1), 'yyyy-MM-dd');
  const showNextDate = format(addDays(current, 1), 'M/dd/yyyy');
  const prevDate = format(addDays(current, -1), 'yyyy-MM-dd');
  const showPrevDate = format(addDays(current, -1), 'M/dd/yyyy');

  const games = await fetchGames(searchDate);

  return (
    <div className="page games-page">
      <h2>
        <span>{showCurrentDate}</span>
        <Link href={`/games/${nextDate}`}>{showNextDate} &raquo;</Link>
        <Link href={`/games/${prevDate}`}>&laquo; {showPrevDate}</Link>
      </h2>
      {games.length === 0 && <div className="games">There are no games scheduled on this date.</div>}
      {games.length > 0 && (
        <div className="games">
          {games.map((game) => (
            <GameCard key={game.gameId} game={game} />
          ))}
        </div>
      )}
    </div>
  );
};

export default GamesView;
