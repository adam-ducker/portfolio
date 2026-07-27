import GamesView from './components/GamesView';

// Home = today's games (Eastern). Server-rendered on each request so the data
// is fresh, the same schedule feed the React app polls.
export default function Home() {
  return <GamesView />;
}
