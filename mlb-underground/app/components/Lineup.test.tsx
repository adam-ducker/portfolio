import { render, screen, within } from '@testing-library/react';
import Lineup from './Lineup';
import { Roster } from '@/lib/types';

const roster = (players: unknown[]): Roster =>
  ({ key: 'AB,H,AVG', players } as unknown as Roster);

const player = (title: string, depth: number, ab: string, h: string, avg: string) =>
  ({ title, depth, AB: ab, H: h, AVG: avg } as unknown);

describe('<Lineup />', () => {
  it('renders the title and column headers from the roster key', () => {
    render(<Lineup title="Batting" roster={roster([player('Lead Off', 0, '4', '2', '.305')])} />);
    expect(screen.getByRole('heading', { level: 3, name: 'Batting' })).toBeInTheDocument();
    ['AB', 'H', 'AVG'].forEach((label) =>
      expect(screen.getByRole('columnheader', { name: label })).toBeInTheDocument()
    );
  });

  it('renders a row per player with each keyed value in order', () => {
    render(
      <Lineup
        title="Batting"
        roster={roster([player('Lead Off', 0, '4', '2', '.305'), player('Cleanup', 1, '3', '1', '.270')])}
      />
    );
    const rows = screen.getAllByRole('row');
    // header row + 2 player rows
    expect(rows).toHaveLength(3);

    const firstPlayerRow = rows[1];
    const cells = within(firstPlayerRow).getAllByRole('cell').map((c) => c.textContent);
    expect(cells).toEqual(['Lead Off', '4', '2', '.305']);
  });

  it('tags the player name cell with its depth class', () => {
    const { container } = render(
      <Lineup title="Batting" roster={roster([player('Bench Bat', 2, '1', '0', '.200')])} />
    );
    expect(container.querySelector('.depth-2')).toHaveTextContent('Bench Bat');
  });

  it('renders nothing when the roster has no players', () => {
    const { container } = render(<Lineup title="Bench" roster={roster([])} />);
    expect(container.querySelector('.roster')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument();
  });
});
