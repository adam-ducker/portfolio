import { render, screen, waitFor } from '@testing-library/react';
import VideoView from './VideoView';

// Stub the video.js-backed player — it can't run in jsdom, and VideoView loads
// it via next/dynamic(ssr:false). Mocking the module makes that import resolve
// to a lightweight placeholder.
jest.mock('./VideoPlayer', () => ({
  __esModule: true,
  default: ({ url }: { url: string }) => <div data-testid="video-player">{url}</div>,
}));

const clipResponse = {
  json: async () => ({
    title: 'Walk-off Homer',
    description: 'A dramatic finish',
    url: 'https://hls/clip.m3u8',
    poster: 'https://img/poster.jpg',
  }),
};

const relatedResponse = {
  json: async () => ({
    videos: [
      { id: 'r1', title: 'Related One', slug: 'related-one', image: 'https://img/r1.jpg', duration: '00:00:20' },
    ],
  }),
};

const routedFetch = () =>
  jest.fn((url: string) =>
    Promise.resolve(url.includes('/api/videos/clip') ? clipResponse : relatedResponse)
  );

afterEach(() => {
  jest.restoreAllMocks();
});

describe('<VideoView />', () => {
  it('fetches the clip and renders its title, description, and player', async () => {
    global.fetch = routedFetch() as unknown as typeof fetch;
    render(<VideoView keywords="dodgers-highlights" slug="walk-off-homer" />);

    expect(await screen.findByText('Walk-off Homer')).toBeInTheDocument();
    expect(screen.getByText('A dramatic finish')).toBeInTheDocument();

    const player = await screen.findByTestId('video-player');
    expect(player).toHaveTextContent('https://hls/clip.m3u8');
  });

  it('renders the related clips sidebar with a de-hyphenated heading', async () => {
    global.fetch = routedFetch() as unknown as typeof fetch;
    render(<VideoView keywords="dodgers-highlights" slug="walk-off-homer" />);

    expect(await screen.findByText('More From: dodgers highlights')).toBeInTheDocument();
    const relatedLink = await screen.findByRole('link', { name: /Related One/ });
    expect(relatedLink).toHaveAttribute('href', '/video/dodgers-highlights/related-one');
  });

  it('requests the clip and related endpoints with the right params', async () => {
    const fetchMock = routedFetch();
    global.fetch = fetchMock as unknown as typeof fetch;
    render(<VideoView keywords="dodgers-highlights" slug="walk-off-homer" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const urls = fetchMock.mock.calls.map((c) => c[0] as string);
    expect(urls.some((u) => u.includes('/api/videos/clip?slug=walk-off-homer'))).toBe(true);
    expect(urls.some((u) => u.includes('/api/videos/search?q=dodgers%20highlights&limit=36'))).toBe(true);
  });

  it('renders no related sidebar when the search returns no videos', async () => {
    global.fetch = jest.fn((url: string) =>
      Promise.resolve(url.includes('/api/videos/clip') ? clipResponse : { json: async () => ({}) })
    ) as unknown as typeof fetch;

    render(<VideoView keywords="dodgers-highlights" slug="walk-off-homer" />);

    // The clip still renders...
    expect(await screen.findByText('Walk-off Homer')).toBeInTheDocument();
    // ...but with no videos, the "More From" sidebar is absent (data.videos || []).
    expect(screen.queryByText(/More From:/)).not.toBeInTheDocument();
  });

  it('renders nothing fatal when the clip fetch fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('down')) as unknown as typeof fetch;
    const { container } = render(<VideoView keywords="x" slug="y" />);
    // No player, no crash.
    await waitFor(() => expect(container.querySelector('.video-page')).toBeInTheDocument());
    expect(screen.queryByTestId('video-player')).not.toBeInTheDocument();
  });
});
