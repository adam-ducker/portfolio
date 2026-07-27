'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyCredentials, createSessionToken, SESSION_COOKIE } from '@/lib/auth';

export type LoginState = { error: string };

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get('username') || '');
  const password = String(formData.get('password') || '');

  const user = verifyCredentials(username, password);
  if (!user) {
    return { error: 'Invalid username or password' };
  }

  const token = await createSessionToken(user);
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect('/');
}

export async function logout(): Promise<void> {
  cookies().delete(SESSION_COOKIE);
  redirect('/login');
}
