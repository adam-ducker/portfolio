import { render, screen } from '@testing-library/react';
import Roster from './Roster';
import { Team } from '@/lib/types';

const group = (players: unknown[]) => ({ key: 'AB,H', players });
const player = (title: string) => ({ title, depth: 0, AB: '1', H: '0' });

const team = (): Team =>
  ({
    name: 'Dodgers',
    batting: group([player('Batter One')]),
    pitching: group([player('Pitcher One')]),
    bench: group([player('Bench One')]),
    bullpen: group([player('Bullpen One')]),
  } as unknown as Team);

describe('<Roster />', () => {
  it('renders all four lineup sections with their titles', () => {
    render(<Roster team={team()} />);
    ['Batting', 'Pitching', 'Bench', 'Bullpen'].forEach((title) =>
      expect(screen.getByRole('heading', { level: 3, name: title })).toBeInTheDocument()
    );
  });

  it('renders each section in Batting / Pitching / Bench / Bullpen order', () => {
    render(<Roster team={team()} />);
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(['Batting', 'Pitching', 'Bench', 'Bullpen']);
  });

  it('omits a section whose group has no players', () => {
    const t = team();
    (t.bench as unknown as { players: unknown[] }).players = [];
    render(<Roster team={t} />);
    expect(screen.queryByRole('heading', { level: 3, name: 'Bench' })).not.toBeInTheDocument();
    // The other three still render.
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3);
  });
});
