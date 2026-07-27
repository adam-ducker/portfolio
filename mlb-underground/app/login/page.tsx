import { redirect } from 'next/navigation';
import { authEnabled, getSession } from '@/lib/auth';
import LoginForm from './LoginForm';

// If already signed in, skip the form. With site auth disabled there is
// nothing to log into, so bounce straight home.
export default async function LoginPage() {
  if (!authEnabled()) {
    redirect('/');
  }
  const session = await getSession();
  if (session) {
    redirect('/');
  }
  return <LoginForm />;
}
