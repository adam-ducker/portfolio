import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { isAuthorized } from '@/lib/auth';
import { getConfig } from '@/lib/config';

// Ported from the PHP mlb.php: obtain an HLS stream URL from the MLB media
// gateway (initSession -> initPlaybackSession) using the stored access token.
// The "mirror" rewrite is intentionally omitted (we return the direct URL).

const DEVICE_ID = 'e413f816-8df1-4fa4-8d45-39d36beace58';
const GATEWAY = 'https://media-gateway.mlb.com/graphql';
const SIGN_IN_ERROR = { message: 'Sign in to MLB.tv to watch this content', data: { username: '', password: '' } };

function tokensPath(tmpDir: string) {
  return path.join(tmpDir, 'tokens.json');
}

function readAccessToken(tmpDir: string): string {
  try {
    const file = tokensPath(tmpDir);
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf8');
      if (raw) {
        return JSON.parse(raw).access_token || '';
      }
    }
  } catch {
    // fall through
  }
  return '';
}

function clearAccessToken(tmpDir: string) {
  try {
    fs.writeFileSync(tokensPath(tmpDir), '');
  } catch {
    // ignore
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function mlbGraphql(body: unknown, token: string, tmpDir: string): Promise<any> {
  const res = await fetch(GATEWAY, {
    method: 'POST',
    headers: {
      authorization: 'Bearer ' + token,
      'apollographql-client-version': '24.13.0-28',
      'content-type': 'application/json',
      'x-apollo-operation-type': 'mutation',
      'user-agent': 'MLB/28 CFNetwork/1410.1 Darwin/22.6.0',
      'apollographql-client-name': 'com.mlb.AtBatUniversal-apollo-ios',
      'x-apollo-operation-name': 'initPlaybackSession',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (res.status === 401) {
    clearAccessToken(tmpDir);
    return { errors: [SIGN_IN_ERROR] };
  }

  return res.json();
}

const initSessionBody = () => ({
  operationName: 'initSession',
  query:
    'mutation initSession($device: InitSessionInput!, $clientType: ClientType!, $experience: ExperienceTypeInput) { initSession(device: $device, clientType: $clientType, experience: $experience) { deviceId sessionId entitlements { code } location { countryCode regionName zipCode latitude longitude } clientExperience features } }',
  variables: {
    device: {
      appVersion: '7.9.0',
      deviceFamily: 'desktop',
      knownDeviceId: DEVICE_ID,
      languagePreference: 'ENGLISH',
      manufacturer: 'Apple',
      model: 'Macintosh',
      os: 'macos',
      osVersion: '10.15.7',
    },
    clientType: 'WEB',
  },
});

const initPlaybackBody = (mediaId: string, sessionId: string) => ({
  operationName: 'initPlaybackSession',
  query:
    'mutation initPlaybackSession($mediaId: String!, $deviceId: String!, $sessionId: String!, $adExperienceType: AdExperienceType = GOOGLE_STANDALONE_AD_PODS, $adCapabilities: [AdExperienceType!]) { initPlaybackSession( mediaId: $mediaId deviceId: $deviceId sessionId: $sessionId adExperienceType: $adExperienceType quality: PLACEHOLDER adCapabilities: $adCapabilities ) { __typename playbackSessionId adScenarios { __typename adParamsObj adScenarioType adExperienceType } playback { __typename url cdn token expiration } heartbeatInfo { __typename url interval } trackingObj content { __typename mediaId feedType contentId contentType callSign } } }',
  variables: {
    adCapabilities: ['GOOGLE_STANDALONE_AD_PODS'],
    adExperienceType: 'GOOGLE_STANDALONE_AD_PODS',
    deviceId: DEVICE_ID,
    mediaId,
    sessionId,
  },
});

type StreamErr = { message: string; data: { username: string; password: string } };

async function getStream(
  mediaId: string,
  token: string,
  tmpDir: string
): Promise<{ url: string; errors: StreamErr[] }> {
  const sessionJson = await mlbGraphql(initSessionBody(), token, tmpDir);
  if (sessionJson.errors) {
    clearAccessToken(tmpDir);
    return { url: '', errors: [SIGN_IN_ERROR] };
  }
  const sessionId = sessionJson?.data?.initSession?.sessionId;
  if (!sessionId) {
    return { url: '', errors: [SIGN_IN_ERROR] };
  }

  const playJson = await mlbGraphql(initPlaybackBody(mediaId, sessionId), token, tmpDir);
  if (playJson.errors) {
    return { url: '', errors: [SIGN_IN_ERROR] };
  }
  const url = playJson?.data?.initPlaybackSession?.playback?.url || '';
  return { url, errors: [] };
}

export async function GET(_request: Request, { params }: { params: { mediaId: string } }) {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { mediaId } = params;
  const config = getConfig();
  const token = readAccessToken(config.tmp_dir);

  if (!token) {
    return NextResponse.json({ url: '', startTime: '', errors: [SIGN_IN_ERROR] });
  }

  // Cache the resolved URL per media id (like the PHP stream-<id>.txt).
  const cacheFile = path.join(config.tmp_dir, `stream-${mediaId}.txt`);
  let cached = true;
  let url = '';

  try {
    if (fs.existsSync(cacheFile)) {
      url = fs.readFileSync(cacheFile, 'utf8');
    }
  } catch {
    url = '';
  }

  if (!url) {
    cached = false;
    const result = await getStream(mediaId, token, config.tmp_dir);
    if (result.errors.length) {
      return NextResponse.json({ url: '', startTime: '', errors: result.errors });
    }
    url = result.url;
  }

  if (url && !cached) {
    try {
      fs.writeFileSync(cacheFile, url);
    } catch {
      // non-fatal
    }
  }

  // From stream.php; the mirror rewrite is intentionally left out.
  url = url.replace('tv-gmc.mlb.com', 'tv-fst.mlb.com');

  return NextResponse.json({ url, startTime: '', errors: [] });
}
