// Server-side proxy for MLB's public content GraphQL (fastball-gateway). These
// clip queries need no auth; proxying them server-side avoids any browser CORS.

const GRAPHQL = 'https://fastball-gateway.mlb.com/graphql';

const HEADERS = {
  Accept: 'application/json',
  Referer: 'https://www.mlb.com/',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
};

const SEARCH_QUERY = `query Search($query: String!, $page: Int, $limit: Int, $languagePreference: LanguagePreference, $contentPreference: ContentPreference, $forgeInstance: ForgeType = MLB, $queryType: QueryType = STRUCTURED) {
  search(query: $query, limit: $limit, page: $page, languagePreference: $languagePreference, contentPreference: $contentPreference, forgeInstance: $forgeInstance, queryType: $queryType) {
    plays {
      mediaPlayback {
        id
        slug
        date
        description
        title
        feeds {
          type
          duration
          image { templateUrl }
        }
      }
    }
  }
}`;

const CLIP_QUERY = `query clipQuery($ids: [String], $languagePreference: LanguagePreference, $idType: MediaPlaybackIdType, $forgeInstance: ForgeType = MLB) {
  mediaPlayback(ids: $ids, languagePreference: $languagePreference, idType: $idType, forgeInstance: $forgeInstance) {
    id
    slug
    title
    description
    date
    feeds {
      type
      duration
      playbacks { name url mimetype }
      image { templateUrl }
    }
  }
}`;

// Image size presets for the CMS template URLs.
const gridImage = (templateUrl: string) =>
  templateUrl.replace('{formatInstructions}', 'ar_16:9,g_auto,q_auto:good,w_500,c_fill,f_jpg');
const posterImage = (templateUrl: string) =>
  templateUrl.replace('{formatInstructions}', 'ar_16:9,g_auto,q_auto:good,w_1000,c_fill,f_jpg');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fastball(query: string, operationName: string, variables: unknown): Promise<any> {
  const url =
    GRAPHQL +
    '?query=' +
    encodeURIComponent(query) +
    '%0A&operationName=' +
    operationName +
    '&variables=' +
    encodeURIComponent(JSON.stringify(variables));

  const res = await fetch(url, { headers: HEADERS, cache: 'no-store' });
  if (!res.ok) {
    throw new Error('fastball-gateway ' + res.status);
  }
  return res.json();
}

export interface VideoClip {
  id: string;
  title: string;
  description: string;
  date: string;
  slug: string;
  image: string;
  duration: string;
}

export interface ClipDetail {
  title: string;
  description: string;
  url: string;
  poster: string;
}

export async function searchVideos(query: string, page = 0, limit = 100): Promise<VideoClip[]> {
  const json = await fastball(SEARCH_QUERY, 'Search', {
    forgeInstance: 'MLB',
    queryType: 'FREETEXT',
    query,
    limit,
    page,
    languagePreference: 'EN',
    contentPreference: 'CMS_FIRST',
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plays = json?.data?.search?.plays ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return plays.map((play: any) => {
    const media = play.mediaPlayback[0];
    const feed = media.feeds[0];
    return {
      id: media.id,
      title: media.title,
      description: media.description,
      date: media.date,
      slug: media.slug,
      image: feed?.image?.templateUrl ? gridImage(feed.image.templateUrl) : '',
      duration: feed?.duration ?? '',
    };
  });
}

export async function getClip(slug: string): Promise<ClipDetail | null> {
  const json = await fastball(CLIP_QUERY, 'clipQuery', {
    forgeInstance: 'MLB',
    ids: slug,
    languagePreference: 'EN',
    idType: 'SLUG',
  });

  const media = json?.data?.mediaPlayback?.[0];
  if (!media) {
    return null;
  }

  const feed = media.feeds[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playback = feed?.playbacks?.find((p: any) => p.name === 'hlsCloud');

  return {
    title: media.title,
    description: media.description,
    url: playback?.url ?? '',
    poster: feed?.image?.templateUrl ? posterImage(feed.image.templateUrl) : '',
  };
}
