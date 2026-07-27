import { render, screen } from '@testing-library/react';
import Media from './Media';
import { Game } from '@/lib/types';

const gameWith = (feeds: unknown[]): Game =>
  ({ gameId: '745100', feeds } as unknown as Game);

describe('<Media />', () => {
  it('renders TV/radio feeds as /player links using the lowercased feed type', () => {
    const game = gameWith([
      { feedType: 'Video', location: 'Home', mediaId: 'm1', teamId: 119, callLetters: 'SNLA' },
    ]);
    render(<Media game={game} feedType="Video" />);

    const link = screen.getByRole('link', { name: /SNLA/ });
    expect(link).toHaveAttribute('href', '/player/745100/video/m1');
  });

  it('renders Clips feeds as /videos links with a "More Video" label', () => {
    const game = gameWith([
      { feedType: 'Clips', location: 'Home', mediaId: 'los-angeles-dodgers', teamId: 119, callLetters: '' },
    ]);
    render(<Media game={game} feedType="Clips" />);

    const link = screen.getByRole('link', { name: /More Video/ });
    expect(link).toHaveAttribute('href', '/videos/los-angeles-dodgers');
  });

  it('only renders feeds matching the requested feedType', () => {
    const game = gameWith([
      { feedType: 'Video', location: 'Home', mediaId: 'v1', teamId: 1, callLetters: 'TV1' },
      { feedType: 'Audio', location: 'Home', mediaId: 'a1', teamId: 1, callLetters: 'RADIO1' },
    ]);
    render(<Media game={game} feedType="Audio" />);

    expect(screen.getByRole('link', { name: /RADIO1/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /TV1/ })).not.toBeInTheDocument();
  });

  it('sorts feeds of the same type by location (Away before Home)', () => {
    const game = gameWith([
      { feedType: 'Video', location: 'Home', mediaId: 'h', teamId: 1, callLetters: 'HOMETV' },
      { feedType: 'Video', location: 'Away', mediaId: 'a', teamId: 2, callLetters: 'AWAYTV' },
    ]);
    render(<Media game={game} feedType="Video" />);

    const links = screen.getAllByRole('link').map((l) => l.textContent);
    expect(links[0]).toContain('AWAYTV');
    expect(links[1]).toContain('HOMETV');
  });

  it('keeps already-ordered feeds in place (comparator returns -1)', () => {
    // Input already Away-before-Home so the comparator hits the a<b (-1) path.
    const game = gameWith([
      { feedType: 'Video', location: 'Away', mediaId: 'a', teamId: 2, callLetters: 'AWAYTV' },
      { feedType: 'Video', location: 'Home', mediaId: 'h', teamId: 1, callLetters: 'HOMETV' },
    ]);
    render(<Media game={game} feedType="Video" />);
    const links = screen.getAllByRole('link').map((l) => l.textContent);
    expect(links[0]).toContain('AWAYTV');
    expect(links[1]).toContain('HOMETV');
  });

  it('keeps both feeds when two share the same location (comparator returns 0)', () => {
    const game = gameWith([
      { feedType: 'Video', location: 'Home', mediaId: 'h1', teamId: 1, callLetters: 'TVONE' },
      { feedType: 'Video', location: 'Home', mediaId: 'h2', teamId: 2, callLetters: 'TVTWO' },
    ]);
    render(<Media game={game} feedType="Video" />);
    expect(screen.getByRole('link', { name: /TVONE/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /TVTWO/ })).toBeInTheDocument();
  });

  it('renders nothing for a feed type with no feeds', () => {
    render(<Media game={gameWith([])} feedType="Video" />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
