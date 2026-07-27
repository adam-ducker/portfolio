import { render, screen } from '@testing-library/react';
import Nav from './Nav';

// The logout server action is a 'use server' module; mock it so importing Nav
// doesn't try to pull in next/headers etc.
jest.mock('../actions/auth', () => ({ logout: jest.fn() }));

// Control the MLB status context so we can assert the bug's class + label
// (title). The real provider fetches on mount, so mock the hook directly.
jest.mock('../contexts/MLBContext', () => ({
  __esModule: true,
  default: jest.fn(() => ({ title: '', status: '' })),
}));
import useMLBContext from '../contexts/MLBContext';
const mockedCtx = useMLBContext as unknown as jest.Mock;

// Nav renders <form action={logout}>; passing a function to form action logs
// one benign warning in this react-dom build. Filter just that line.
const realError = console.error.bind(console);
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('Invalid value for prop')) {
      return;
    }
    realError(...(args as []));
  });
});
afterAll(() => {
  (console.error as jest.Mock).mockRestore();
});

beforeEach(() => {
  mockedCtx.mockReturnValue({ title: '', status: '' });
});

describe('<Nav />', () => {
  it('always renders the home-brand link', () => {
    render(<Nav username={null} active={false} />);
    const brand = screen.getByRole('link', { name: 'MLB Underground' });
    expect(brand).toHaveAttribute('href', '/');
  });

  it('shows the greeting, a Log Out button, and the status dot when signed in', () => {
    const { container } = render(<Nav username="adam" active />);
    expect(screen.getByText(/Hi, adam/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log Out' })).toBeInTheDocument();
    expect(container.querySelector('.mlb-bug')).toBeInTheDocument();
  });

  it('shows the status dot but no greeting/Log Out when active with no session (auth off)', () => {
    const { container } = render(<Nav username={null} active />);
    expect(screen.queryByText(/Hi,/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Log Out' })).not.toBeInTheDocument();
    expect(container.querySelector('.mlb-bug')).toBeInTheDocument();
  });

  it('hides the greeting, Log Out, and status dot when inactive and signed out', () => {
    const { container } = render(<Nav username={null} active={false} />);
    expect(screen.queryByText(/Hi,/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Log Out' })).not.toBeInTheDocument();
    expect(container.querySelector('.mlb-bug')).not.toBeInTheDocument();
  });

  it('reflects the MLB context status as the bug class and the title as its label', () => {
    mockedCtx.mockReturnValue({ title: 'Expires: 2026-07-27 3:00 PM', status: 'success' });
    const { container } = render(<Nav username={null} active />);
    const bug = container.querySelector('.mlb-bug');
    expect(bug).toHaveClass('mlb-bug', 'success');
    expect(bug).toHaveAttribute('title', 'Expires: 2026-07-27 3:00 PM');
  });

  it('shows the error state class and message when the token refresh fails', () => {
    mockedCtx.mockReturnValue({ title: 'MLB sign-in failed', status: 'error' });
    const { container } = render(<Nav username="adam" active />);
    const bug = container.querySelector('.mlb-bug');
    expect(bug).toHaveClass('error');
    expect(bug).toHaveAttribute('title', 'MLB sign-in failed');
  });

  it('renders a bare "mlb-bug" class and empty label at the context default', () => {
    const { container } = render(<Nav username="adam" active />);
    const bug = container.querySelector('.mlb-bug');
    // Default context is {title:'', status:''} -> class is just "mlb-bug".
    expect(bug?.className.trim()).toBe('mlb-bug');
    expect(bug).toHaveAttribute('title', '');
  });
});
