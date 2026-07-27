import type { Metadata } from 'next';
import './globals.scss';
import './nav.scss';
import './games.scss';
import './login.scss';
import './player.scss';
import './linescore.scss';
import './roster.scss';
import './matchup.scss';
import './events.scss';
import './videos.scss';
import './video.scss';
import 'video.js/dist/video-js.css';
import Nav from './components/Nav';
import { MLBContextProvider } from './contexts/MLBContext';
import { authEnabled, getSession } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'MLB Underground',
  description: "Today's MLB games",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const enabled = authEnabled();
  const session = enabled ? await getSession() : null;
  // The site is "active" (MLB token flow runs, status dot shows) whenever
  // content is visible: always when auth is off, or once signed in when on.
  const active = !enabled || !!session;

  return (
    <html lang="en">
      <body>
        <MLBContextProvider active={active}>
          <Nav username={session?.username ?? null} active={active} />
          {children}
        </MLBContextProvider>
      </body>
    </html>
  );
}
