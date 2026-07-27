import { render, screen } from '@testing-library/react';
import GamesView from './GamesView';

// Isolate GamesView's own logic (auth gate, date nav, empty vs list) from the
// schedule transform and the card rendering.
// Relative paths so jest's resolver finds them; the '@/lib/*' imports below
// resolve to the same modules and pick up these mocks.
jest.mock('../../lib/auth', () => ({ isAuthorized: jest.fn() }));
jest.mock('../../lib/stats', () => ({ gamesData: jest.fn(), sortGames: jest.fn() }));
jest.mock('./GameCard', () => ({
  __esModule: true,
  default: ({ game }: { game: { gameId: string; title: string } }) => (
    <div data-testid="game-card">{game.title}</div>
  ),
}));

const redirect = jest.fn((_url: string) => {
  // The real next/navigation redirect throws to halt rendering; mirror that so
  // control flow stops the way it does in the app.
  throw new Error('NEXT_REDIRECT');
});
jest.mock('next/navigation', () => ({ redirect: (url: string) => redirect(url) }));

import { isAuthorized } from '@/lib/auth';
import { gamesData, sortGames } from '@/lib/stats';

const mockedAuth = isAuthorized as jest.Mock;
const mockedSort = sortGames as jest.Mock;

// Render whatever the async server component returns.
const renderView = async (props: { date?: string }) => render(await GamesView(props));

beforeEach(() => {
  jest.clearAllMocks();
  redirect.mockImplementation(() => {
    throw new Error('NEXT_REDIRECT');
  });
  // Authorized by default (mirrors the auth-off demo); individual tests override.
  mockedAuth.mockResolvedValue(true);
  (gamesData as jest.Mock).mockReturnValue([]);
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ dates: [] }) }) as unknown as typeof fetch;
});

describe('<GamesView />', () => {
  it('redirects to /login when not authorized (auth on, no session)', async () => {
    mockedAuth.mockResolvedValue(false);
    await expect(renderView({ date: '2026-07-25' })).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/login');
  });

  it('shows the "no games" message when the schedule is empty', async () => {
    mockedSort.mockReturnValue([]);

    await renderView({ date: '2026-07-25' });

    expect(screen.getByText(/no games scheduled on this date/i)).toBeInTheDocument();
    expect(screen.queryByTestId('game-card')).not.toBeInTheDocument();
  });

  it('renders a GameCard per game and the formatted current date', async () => {
    mockedSort.mockReturnValue([
      { gameId: '1', title: 'Away @ Home' },
      { gameId: '2', title: 'Guests @ Hosts' },
    ]);

    await renderView({ date: '2026-07-25' });

    const cards = screen.getAllByTestId('game-card');
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent('Away @ Home');
    // 2026-07-25 is a Saturday; the header renders the long-form date.
    expect(screen.getByText(/Saturday July 25th 2026/)).toBeInTheDocument();
  });

  it('defaults to today (Eastern) when no date is provided', async () => {
    mockedSort.mockReturnValue([]);

    // No date arg -> exercises the easternToday() default path.
    await renderView({});

    expect(screen.getByText(/no games scheduled on this date/i)).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalled();
  });

  it('renders no games when the schedule request is not ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({}) }) as unknown as typeof fetch;

    await renderView({ date: '2026-07-25' });

    expect(screen.getByText(/no games scheduled on this date/i)).toBeInTheDocument();
    // gamesData is never reached when the response isn't ok.
    expect(gamesData).not.toHaveBeenCalled();
  });

  it('builds prev/next date links around the current date', async () => {
    mockedSort.mockReturnValue([]);

    await renderView({ date: '2026-07-25' });

    expect(screen.getByRole('link', { name: /7\/26\/2026/ })).toHaveAttribute('href', '/games/2026-07-26');
    expect(screen.getByRole('link', { name: /7\/24\/2026/ })).toHaveAttribute('href', '/games/2026-07-24');
  });
});
