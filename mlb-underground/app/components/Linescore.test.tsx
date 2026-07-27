import { render, screen, within } from '@testing-library/react';
import Linescore from './Linescore';
import { gameDataDefault } from '@/lib/stats';
import type { GameData, Line } from '@/lib/types';

// White Sox @ Dodgers, top of the 3rd. Labels include a leading blank cell
// (for the team-abbrev column) and trailing R / H / E totals.
const liveLinescore: Line = {
  gameState: 'Live',
  currentInning: 3,
  inningState: 'Top',
  labels: ['',    '1', '2', '3', '4', '5', '6', '7', '8', '9', 'R', 'H', 'E'],
  top:    ['CWS', '0', '1', '',  '',  '',  '',  '',  '',  '',  '1', '2', '0'],
  bottom: ['LAD', '0', '0', '',  '',  '',  '',  '',  '',  '',  '0', '1', '0'],
};

// Dodgers win 7-3, no need to bat in the bottom of the 9th — the cell at
// index 9 of the bottom row is 'x' instead of a run total.
const finalLinescore: Line = {
  gameState: 'Final',
  currentInning: 9,
  inningState: 'End',
  labels: ['',    '1', '2', '3', '4', '5', '6', '7', '8', '9', 'R', 'H',  'E'],
  top:    ['CWS', '0', '1', '0', '0', '0', '2', '0', '0', '0', '3', '8',  '1'],
  bottom: ['LAD', '0', '0', '2', '1', '0', '0', '3', '1', 'x', '7', '12', '0'],
};

const buildFixture = (overrides: Partial<GameData> = {}): GameData => ({
  ...gameDataDefault,
  title: 'White Sox @ Dodgers - In Progress - Top 3rd',
  linescore: liveLinescore,
  ...overrides,
});

const rowCellText = (row: HTMLElement) =>
  within(row)
    .getAllByRole('cell')
    .map((cell) => cell.textContent);

describe('<Linescore />', () => {
  it('renders the game title as an h3', () => {
    render(<Linescore gameData={buildFixture()} />);
    expect(
      screen.getByRole('heading', { level: 3, name: /White Sox @ Dodgers/ })
    ).toBeInTheDocument();
  });

  it('renders three table rows in labels / away / home order', () => {
    render(<Linescore gameData={buildFixture()} />);
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(3);

    // The first row is the labels row; the next two are away (top of inning)
    // and home (bottom of inning) — that's the order the component renders
    // them, and it's important because <Linescore /> doesn't render the row
    // headers anywhere else.
    expect(rowCellText(rows[0])[0]).toBe('');
    expect(rowCellText(rows[1])[0]).toBe('CWS');
    expect(rowCellText(rows[2])[0]).toBe('LAD');
  });

  it('renders the inning labels in order across the first row', () => {
    render(<Linescore gameData={buildFixture()} />);
    const [labelsRow] = screen.getAllByRole('row');
    expect(rowCellText(labelsRow)).toEqual(liveLinescore.labels);
  });

  it('renders the away team line in the top row', () => {
    render(<Linescore gameData={buildFixture()} />);
    const [, topRow] = screen.getAllByRole('row');
    expect(rowCellText(topRow)).toEqual(liveLinescore.top);
  });

  it('renders the home team line in the bottom row', () => {
    render(<Linescore gameData={buildFixture()} />);
    const [, , bottomRow] = screen.getAllByRole('row');
    expect(rowCellText(bottomRow)).toEqual(liveLinescore.bottom);
  });

  // The bottom of the 9th gets an 'x' (rather than a run total) when the home
  // team wins without needing to bat in the bottom half. This is one of the
  // more visible "look right" rules in a baseball linescore.
  it('renders an "x" for the home bottom-9th when the home team did not bat', () => {
    render(<Linescore gameData={buildFixture({ linescore: finalLinescore })} />);
    const [, , bottomRow] = screen.getAllByRole('row');
    const cells = within(bottomRow).getAllByRole('cell');
    // Index 9 is the 9th inning column (index 0 is the LAD abbreviation).
    expect(cells[9]).toHaveTextContent('x');
  });

  // The last three cells of each row are the R / H / E summary block.
  // <Linescore /> tags them with the "last" CSS class (and the leftmost one
  // gets an additional "runs" class) so the stylesheet can give them a heavy
  // border and a different background. This is the only structural contract
  // that the stylesheet relies on, so it's worth pinning.
  it('marks the last three cells of each row as the R/H/E summary block', () => {
    render(<Linescore gameData={buildFixture()} />);
    const rows = screen.getAllByRole('row');

    rows.forEach((row) => {
      const cells = within(row).getAllByRole('cell');
      const tail = cells.slice(-3);
      // The "runs" column is the leftmost of the three.
      expect(tail[0]).toHaveClass('runs');
      tail.forEach((cell) => {
        expect(cell).toHaveClass('last');
      });
      // No earlier cell should carry these classes — pin that contract too so
      // a refactor doesn't accidentally widen the summary block.
      cells.slice(0, -3).forEach((cell) => {
        expect(cell).not.toHaveClass('last');
        expect(cell).not.toHaveClass('runs');
      });
    });
  });

  // The default GameData has an empty linescore — labels/top/bottom are all
  // empty arrays. This is the state on first render of Player.tsx before
  // fetchGame resolves. <Linescore /> should render the empty shell without
  // crashing.
  it('renders an empty shell when the linescore has no data yet', () => {
    render(<Linescore gameData={gameDataDefault} />);
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(3);
    // No cells in any row when arrays are empty.
    rows.forEach((row) => {
      expect(within(row).queryAllByRole('cell')).toHaveLength(0);
    });
  });
});
