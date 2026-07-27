/**
 * @jest-environment node
 */
import { login, logout } from './auth';

// Mock the collaborators so we can assert the action's behavior in isolation.
const cookieSet = jest.fn();
const cookieDelete = jest.fn();
jest.mock('next/headers', () => ({
  cookies: () => ({ set: cookieSet, delete: cookieDelete }),
}));

const redirect = jest.fn();
jest.mock('next/navigation', () => ({ redirect: (url: string) => redirect(url) }));

// Relative path so jest's resolver finds it; the '@/lib/auth' import below
// resolves to the same module and picks up this mock.
jest.mock('../../lib/auth', () => ({
  SESSION_COOKIE: 'mlbu_session',
  verifyCredentials: jest.fn(),
  createSessionToken: jest.fn(),
}));
import { verifyCredentials, createSessionToken } from '@/lib/auth';

const mockedVerify = verifyCredentials as jest.Mock;
const mockedCreate = createSessionToken as jest.Mock;

const formData = (fields: Record<string, string>) => {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => fd.set(k, v));
  return fd;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('login', () => {
  it('returns an error and sets no cookie for invalid credentials', async () => {
    mockedVerify.mockReturnValue(null);

    const result = await login({ error: '' }, formData({ username: 'adam', password: 'wrong' }));

    expect(result).toEqual({ error: 'Invalid username or password' });
    expect(cookieSet).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('sets an httpOnly session cookie and redirects home on success', async () => {
    mockedVerify.mockReturnValue({ id: '7', username: 'adam' });
    mockedCreate.mockResolvedValue('signed.jwt.token');

    await login({ error: '' }, formData({ username: 'adam', password: 'changeme' }));

    expect(mockedCreate).toHaveBeenCalledWith({ id: '7', username: 'adam' });
    expect(cookieSet).toHaveBeenCalledWith(
      'mlbu_session',
      'signed.jwt.token',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' })
    );
    expect(redirect).toHaveBeenCalledWith('/');
  });

  it('coerces missing form fields to empty strings', async () => {
    mockedVerify.mockReturnValue(null);
    await login({ error: '' }, formData({}));
    expect(mockedVerify).toHaveBeenCalledWith('', '');
  });
});

describe('logout', () => {
  it('deletes the session cookie and redirects to /login', async () => {
    await logout();
    expect(cookieDelete).toHaveBeenCalledWith('mlbu_session');
    expect(redirect).toHaveBeenCalledWith('/login');
  });
});
