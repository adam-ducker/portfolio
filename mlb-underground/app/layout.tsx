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
import { getSession } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'MLB Underground',
  description: "Today's MLB games",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <html lang="en">
      <body>
        <MLBContextProvider isLoggedIn={!!session}>
          <Nav username={session?.username ?? null} />
          {children}
        </MLBContextProvider>
      </body>
    </html>
  );
}
