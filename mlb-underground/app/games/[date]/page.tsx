import GamesView from '@/app/components/GamesView';

// /games/YYYY-MM-DD — the same view for a specific date (powers the prev/next
// links in the header).
export default function GamesByDate({ params }: { params: { date: string } }) {
  return <GamesView date={params.date} />;
}
