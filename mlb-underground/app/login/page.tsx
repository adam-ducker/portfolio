import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import LoginForm from './LoginForm';

// If already signed in, skip the form.
export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect('/');
  }
  return <LoginForm />;
}
