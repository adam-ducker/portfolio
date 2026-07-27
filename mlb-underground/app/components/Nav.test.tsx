import { render, screen } from '@testing-library/react';
import Nav from './Nav';

// The logout server action is a 'use server' module; mock it so importing Nav
// doesn't try to pull in next/headers etc. We only assert the button renders.
// Relative path (not the @/ alias) so jest's resolver finds the module to mock.
jest.mock('../actions/auth', () => ({ logout: jest.fn() }));

// Nav renders <form action={logout}>; passing a function to form action logs
// one benign warning in this react-dom build (form-actions flag off outside
// Next's bundler). Filter just that line; let every other console.error through.
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

describe('<Nav />', () => {
  it('always renders the home-brand link', () => {
    render(<Nav username={null} />);
    const brand = screen.getByRole('link', { name: 'MLB Underground' });
    expect(brand).toHaveAttribute('href', '/');
  });

  it('shows the greeting, a Log Out button, and the status dot when signed in', () => {
    const { container } = render(<Nav username="adam" />);
    expect(screen.getByText(/Hi, adam/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log Out' })).toBeInTheDocument();
    expect(container.querySelector('.mlb-bug')).toBeInTheDocument();
  });

  it('hides the greeting, Log Out, and status dot when signed out', () => {
    const { container } = render(<Nav username={null} />);
    expect(screen.queryByText(/Hi,/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Log Out' })).not.toBeInTheDocument();
    expect(container.querySelector('.mlb-bug')).not.toBeInTheDocument();
  });

  it('defaults the status dot to the context default when no provider wraps it', () => {
    const { container } = render(<Nav username="adam" />);
    // Default context is {title:'', status:''} -> class is just "mlb-bug".
    expect(container.querySelector('.mlb-bug')?.className.trim()).toBe('mlb-bug');
  });
});
