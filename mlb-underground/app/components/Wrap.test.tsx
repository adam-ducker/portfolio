import { render, screen } from '@testing-library/react';
import Wrap from './Wrap';
import { WrapDetails } from '@/lib/types';

const wrap = (overrides: Partial<WrapDetails>): WrapDetails => ({
  title: 'Home Club win 3-1',
  winner: 'W: Ace Pitcher',
  winnerId: '200',
  loser: 'L: Losing Pitcher',
  loserId: '201',
  ...overrides,
});

describe('<Wrap />', () => {
  it('renders the wrap title as an h3', () => {
    render(<Wrap wrap={wrap({})} />);
    expect(screen.getByRole('heading', { level: 3, name: 'Home Club win 3-1' })).toBeInTheDocument();
  });

  it('renders the winner and loser blocks', () => {
    render(<Wrap wrap={wrap({})} />);
    expect(screen.getByText('W: Ace Pitcher')).toBeInTheDocument();
    expect(screen.getByText('L: Losing Pitcher')).toBeInTheDocument();
  });

  it('shows the "only losers are the fans" line for a game with no decisions', () => {
    render(<Wrap wrap={wrap({ winnerId: '', loserId: '', winner: '', loser: '' })} />);
    expect(screen.getByText(/only losers today are the fans/i)).toBeInTheDocument();
  });

  it('renders only the winner block when there is a winner but no loser', () => {
    render(<Wrap wrap={wrap({ loserId: '', loser: '' })} />);
    expect(screen.getByText('W: Ace Pitcher')).toBeInTheDocument();
    expect(screen.queryByText('L: Losing Pitcher')).not.toBeInTheDocument();
    expect(screen.queryByText(/only losers today/i)).not.toBeInTheDocument();
  });
});
