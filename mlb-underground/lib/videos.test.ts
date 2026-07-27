/**
 * @jest-environment node
 */
import { searchVideos, getClip } from './videos';

const okJson = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

afterEach(() => {
  jest.restoreAllMocks();
});

describe('searchVideos', () => {
  it('maps search plays into VideoClip objects with a sized grid image', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      okJson({
        data: {
          search: {
            plays: [
              {
                mediaPlayback: [
                  {
                    id: 'abc',
                    slug: 'cool-play',
                    date: '2026-07-25',
                    description: 'A cool play',
                    title: 'Cool Play',
                    feeds: [
                      { type: 'CMS', duration: '00:00:30', image: { templateUrl: 'https://img/{formatInstructions}/x.jpg' } },
                    ],
                  },
                ],
              },
            ],
          },
        },
      })
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const clips = await searchVideos('Dodgers');

    expect(clips).toHaveLength(1);
    expect(clips[0]).toEqual({
      id: 'abc',
      title: 'Cool Play',
      description: 'A cool play',
      date: '2026-07-25',
      slug: 'cool-play',
      image: 'https://img/ar_16:9,g_auto,q_auto:good,w_500,c_fill,f_jpg/x.jpg',
      duration: '00:00:30',
    });

    // Request goes to the fastball GraphQL gateway with the Search operation.
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('fastball-gateway.mlb.com/graphql');
    expect(url).toContain('operationName=Search');
  });

  it('returns an empty array when there are no plays', async () => {
    global.fetch = jest.fn().mockResolvedValue(okJson({ data: { search: { plays: [] } } })) as unknown as typeof fetch;
    expect(await searchVideos('Nobody')).toEqual([]);
  });

  it('returns an empty array when the response has no search data', async () => {
    // data.search is absent -> plays falls back via ?? [] .
    global.fetch = jest.fn().mockResolvedValue(okJson({ data: {} })) as unknown as typeof fetch;
    expect(await searchVideos('Nobody')).toEqual([]);
  });

  it('falls back to empty image/duration when a feed has no image', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      okJson({
        data: {
          search: {
            plays: [
              {
                mediaPlayback: [
                  { id: 'x', slug: 's', date: 'd', description: '', title: 'T', feeds: [{ type: 'CMS' }] },
                ],
              },
            ],
          },
        },
      })
    ) as unknown as typeof fetch;

    const [clip] = await searchVideos('q');
    expect(clip.image).toBe('');
    expect(clip.duration).toBe('');
  });

  it('throws when the gateway responds non-OK', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) }) as unknown as typeof fetch;
    await expect(searchVideos('q')).rejects.toThrow(/fastball-gateway 503/);
  });
});

describe('getClip', () => {
  it('returns the hlsCloud playback url and a sized poster', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      okJson({
        data: {
          mediaPlayback: [
            {
              id: 'c1',
              slug: 'the-clip',
              title: 'The Clip',
              description: 'desc',
              date: '2026-07-25',
              feeds: [
                {
                  type: 'CMS',
                  duration: '00:01:00',
                  playbacks: [
                    { name: 'mp4Avc', url: 'https://mp4', mimetype: 'video/mp4' },
                    { name: 'hlsCloud', url: 'https://hls.m3u8', mimetype: 'application/x-mpegURL' },
                  ],
                  image: { templateUrl: 'https://img/{formatInstructions}/p.jpg' },
                },
              ],
            },
          ],
        },
      })
    ) as unknown as typeof fetch;

    const clip = await getClip('the-clip');
    expect(clip).toEqual({
      title: 'The Clip',
      description: 'desc',
      url: 'https://hls.m3u8',
      poster: 'https://img/ar_16:9,g_auto,q_auto:good,w_1000,c_fill,f_jpg/p.jpg',
    });
  });

  it('returns null when there is no media', async () => {
    global.fetch = jest.fn().mockResolvedValue(okJson({ data: { mediaPlayback: [] } })) as unknown as typeof fetch;
    expect(await getClip('missing')).toBeNull();
  });

  it('returns an empty url when there is no hlsCloud playback', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      okJson({
        data: {
          mediaPlayback: [
            { title: 'T', description: '', date: 'd', feeds: [{ playbacks: [{ name: 'mp4Avc', url: 'https://mp4' }] }] },
          ],
        },
      })
    ) as unknown as typeof fetch;

    const clip = await getClip('slug');
    expect(clip?.url).toBe('');
    expect(clip?.poster).toBe('');
  });
});
