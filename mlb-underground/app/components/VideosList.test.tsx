import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VideosList from './VideosList';

const clip = (id: string, title: string) => ({
  id,
  title,
  description: `${title} description`,
  date: '2026-07-25',
  slug: `${id}-slug`,
  image: `https://img/${id}.jpg`,
  duration: '00:00:30',
});

const respond = (videos: unknown[]) => ({ json: async () => ({ videos }) });

afterEach(() => {
  jest.restoreAllMocks();
});

describe('<VideosList />', () => {
  it('title-cases the slug for the heading', async () => {
    global.fetch = jest.fn().mockResolvedValue(respond([])) as unknown as typeof fetch;
    render(<VideosList slug="los-angeles-dodgers" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Videos: Los Angeles Dodgers' })).toBeInTheDocument();
    // Let the mount fetch settle so its setState runs inside act().
    await screen.findByRole('button', { name: 'Load More Videos' });
  });

  it('fetches page 0 on mount and renders the returned clips', async () => {
    const fetchMock = jest.fn().mockResolvedValue(respond([clip('a', 'First Clip'), clip('b', 'Second Clip')]));
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<VideosList slug="dodgers" />);

    await waitFor(() => expect(screen.getByText('First Clip')).toBeInTheDocument());
    expect(screen.getByText('Second Clip')).toBeInTheDocument();
    expect(screen.getByText('First Clip description')).toBeInTheDocument();

    // A clip links to /video/<slug>/<clip-slug>.
    expect(screen.getByRole('link', { name: /First Clip/ })).toHaveAttribute(
      'href',
      '/video/dodgers/a-slug'
    );

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('/api/videos/search?q=Dodgers&page=0');
  });

  it('formats the clip date as a weekday label', async () => {
    global.fetch = jest.fn().mockResolvedValue(respond([clip('a', 'Dated Clip')])) as unknown as typeof fetch;
    render(<VideosList slug="dodgers" />);
    // 2026-07-25 is a Saturday.
    await waitFor(() => expect(screen.getByText('Saturday, July 25')).toBeInTheDocument());
  });

  it('loads another page when "Load More Videos" is clicked', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(respond([clip('a', 'Page Zero Clip')]))
      .mockResolvedValueOnce(respond([clip('b', 'Page One Clip')]));
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<VideosList slug="dodgers" />);
    await waitFor(() => expect(screen.getByText('Page Zero Clip')).toBeInTheDocument());

    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: 'Load More Videos' }));
    });

    await waitFor(() => expect(screen.getByText('Page One Clip')).toBeInTheDocument());
    expect((fetchMock.mock.calls[1][0] as string)).toContain('page=1');
  });

  it('renders an empty date label for an unparseable clip date', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(respond([{ ...clip('a', 'No Date Clip'), date: 'not-a-date' }])) as unknown as typeof fetch;

    render(<VideosList slug="dodgers" />);

    const heading = await screen.findByText('No Date Clip');
    // The <h3> date label sibling is empty (isNaN(date) -> '').
    const h3 = heading.parentElement?.querySelector('h3');
    expect(h3).toHaveTextContent('');
  });

  it('handles a page response with no videos field', async () => {
    global.fetch = jest.fn().mockResolvedValue({ json: async () => ({}) }) as unknown as typeof fetch;

    render(<VideosList slug="dodgers" />);

    // Loads (button appears) with an empty grid — data.videos || [] resolves to [].
    expect(await screen.findByRole('button', { name: 'Load More Videos' })).toBeInTheDocument();
  });

  it('still renders (empty) when the search request fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('boom')) as unknown as typeof fetch;
    render(<VideosList slug="dodgers" />);
    // The heading always renders; the grid simply has no clips.
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Load More Videos' })).toBeInTheDocument());
  });
});
