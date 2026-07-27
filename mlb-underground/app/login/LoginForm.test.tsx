import { render, screen } from '@testing-library/react';

// Don't pull the real server action into the client test.
jest.mock('../actions/auth', () => ({ login: jest.fn() }));

// react-dom's useFormState isn't exported by the CJS build jest resolves, so we
// provide it. We return a controllable state and a no-op dispatch, then drive
// the two render branches (error / no error) by setting `formState` directly —
// simpler and more deterministic than simulating a form submit (which react-dom
// won't dispatch here anyway, since its form-actions feature flag is off).
let formState: { error: string } = { error: '' };
jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  useFormState: () => [formState, jest.fn()],
}));

import LoginForm from './LoginForm';

// Passing a function to <form action> logs one benign warning in this react-dom
// build (form-actions flag off outside Next's bundler). Filter just that line so
// the run stays clean; every other console.error still surfaces.
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
  formState = { error: '' };
});

describe('<LoginForm />', () => {
  it('renders the username and password inputs and the submit button', () => {
    render(<LoginForm />);
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
  });

  it('renders the not-affiliated disclaimer', () => {
    render(<LoginForm />);
    expect(screen.getByText(/not affiliated with/i)).toBeInTheDocument();
  });

  it('shows no error message when state has no error', () => {
    render(<LoginForm />);
    expect(document.querySelector('.error')).not.toBeInTheDocument();
  });

  it('renders the error message when the action returns one', () => {
    formState = { error: 'Invalid username or password' };
    render(<LoginForm />);
    expect(screen.getByText('Invalid username or password')).toHaveClass('error');
  });
});
