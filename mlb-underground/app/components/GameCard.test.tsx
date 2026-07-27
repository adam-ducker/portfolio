import { render, screen, within } from '@testing-library/react';
import GameCard from './GameCard';
import { Game } from '@/lib/types';

const emptyPlayer = { id: 0, name: '', stats: '' };

const baseSummary = {
  away: { name: 'CWS', runs: 0, hits: 0, errors: 0 },
  home: { name: 'CHC', runs: 0, hits: 0, errors: 0 },
  first: '',
  second: '',
  third: '',
  outs: 0,
  balls: 0,
  strikes: 0,
  player_1: emptyPlayer,
  player_2: emptyPlayer,
};

const makeGame = (overrides: Partial<Game>, summaryOverrides = {}): Game =>
  ({
    gameId: '745100',
    title: 'Chicago White Sox @ Chicago Cubs',
    venue: 'Wrigley Field',
    status: 'Scheduled',
    description: '',
    category: 'scheduled',
    feeds: [],
    summary: { ...baseSummary, ...summaryOverrides },
    ...overrides,
  } as unknown as Game);

describe('<GameCard />', () => {
  it('renders the title, venue, and status', () => {
    render(<GameCard game={makeGame({})} />);
    expect(screen.getByRole('heading', { level: 3, name: /White Sox @ Chicago Cubs/ })).toBeInTheDocument();
    expect(screen.getByText('Wrigley Field')).toBeInTheDocument();
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
  });

  it('prefixes the description before the status when present', () => {
    render(<GameCard game={makeGame({ description: 'Game 2', status: 'Scheduled' })} />);
    expect(screen.getByText('Game 2 - Scheduled')).toBeInTheDocument();
  });

  it('adds the game category as a class on the outer box', () => {
    const { container } = render(<GameCard game={makeGame({ category: 'live' })} />);
    expect(container.querySelector('.game.live')).toBeInTheDocument();
  });

  it('does not render the R/H/E box for a scheduled game', () => {
    render(<GameCard game={makeGame({ category: 'scheduled' })} />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders the R/H/E box with totals for a final game', () => {
    render(
      <GameCard
        game={makeGame(
          { category: 'final', status: 'Final' },
          { away: { name: 'CWS', runs: 1, hits: 5, errors: 0 }, home: { name: 'CHC', runs: 4, hits: 9, errors: 1 } }
        )}
      />
    );
    const table = screen.getByRole('table');
    expect(within(table).getByText('CWS')).toBeInTheDocument();
    // Home runs total shows in the box.
    expect(within(table).getByText('4')).toBeInTheDocument();
  });

  it('renders live game state (outs + count + bases) only when live', () => {
    render(
      <GameCard
        game={makeGame(
          { category: 'live', status: 'In Progress - Top 4' },
          { outs: 2, balls: 3, strikes: 1, first: 'Runner One' }
        )}
      />
    );
    expect(screen.getByText(/2 out/)).toBeInTheDocument();
    expect(screen.getByText(/3-1/)).toBeInTheDocument();
  });

  it('pluralizes outs correctly (1 out, no s)', () => {
    render(<GameCard game={makeGame({ category: 'live' }, { outs: 1 })} />);
    expect(screen.getByText(/1 out,/)).toBeInTheDocument();
  });

  it('marks each occupied base with the "on" class', () => {
    const { container } = render(
      <GameCard
        game={makeGame({ category: 'live' }, { first: 'R1', second: 'R2', third: 'R3' })}
      />
    );
    expect(container.querySelector('.base.first.on')).toBeInTheDocument();
    expect(container.querySelector('.base.second.on')).toBeInTheDocument();
    expect(container.querySelector('.base.third.on')).toBeInTheDocument();
  });

  it('renders the pitcher/batter matchup when player_1 has a name', () => {
    render(
      <GameCard
        game={makeGame(
          {},
          {
            player_1: { id: 111, name: 'Ace Pitcher', stats: '2.50 ERA' },
            player_2: { id: 222, name: 'Big Bat', stats: '.305 AVG' },
          }
        )}
      />
    );
    expect(screen.getByText('Ace Pitcher')).toBeInTheDocument();
    expect(screen.getByText('Big Bat')).toBeInTheDocument();
    expect(screen.getByText('2.50 ERA')).toBeInTheDocument();
  });

  it('omits the matchup block when player_1 has no name', () => {
    render(<GameCard game={makeGame({}, { player_1: emptyPlayer })} />);
    expect(screen.queryByText('Ace Pitcher')).not.toBeInTheDocument();
  });
});
