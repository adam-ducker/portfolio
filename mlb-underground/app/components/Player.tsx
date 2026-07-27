'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import axios from 'axios';
import { useInterval } from '@/lib/useInterval';
import { GameData, Stream } from '@/lib/types';
import { gameDataDefault, buildGameData, LiveJson } from '@/lib/stats';
import Linescore from './Linescore';
import Preview from './Preview';
import Roster from './Roster';
import Matchup from './Matchup';
import Wrap from './Wrap';
import Events from './Events';

// video.js is browser-only — load it client-side only.
const VideoPlayer = dynamic(() => import('./VideoPlayer'), { ssr: false });

type PlayerProps = {
  gameId: string;
  feedType: string;
  mediaId: string;
};

type GameDataResponse = { data: LiveJson };
type StreamResponse = { data: Stream };

const Player = ({ gameId, feedType, mediaId }: PlayerProps) => {
  const [openTab, setOpenTab] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [gameTitle, setGameTitle] = useState('');
  const [stream, setStream] = useState<Stream>({ url: '', startTime: '', errors: [] });
  const [streamErrors, setStreamErrors] = useState<string>('');
  const [attempts, setAttempts] = useState(0);
  const [gameData, setGameData] = useState<GameData>(gameDataDefault);

  const fetchGame = useCallback(() => {
    axios
      .get('https://statsapi.mlb.com/api/v1.1/game/' + gameId + '/feed/live')
      .then((response: GameDataResponse) => {
        const game = buildGameData(response.data);
        setGameData(game);
        if (game.title !== gameTitle) {
          setGameTitle(game.title);
          document.title = 'MLB Underground - ' + game.title;
        }
        setLoaded(true);
      })
      .catch(() => {
        // ignore; will retry on the interval
      });
  }, [gameId, gameTitle]);

  const fetchStream = useCallback(() => {
    axios
      .get('/api/media/' + mediaId)
      .then((response: StreamResponse) => {
        setStream(response.data);
        if (response.data.errors.length) {
          setStreamErrors(response.data.errors[0].message);
        }
      })
      .catch(() => {
        // ignore; will retry on the interval
      });
  }, [mediaId]);

  useInterval(() => {
    if (stream.url === '' && mediaId) {
      setAttempts(attempts + 1);
      fetchStream();
    }
  }, 5000);

  useInterval(() => {
    fetchGame();
  }, 5000);

  useEffect(() => {
    fetchStream();
    fetchGame();
  }, [fetchStream, fetchGame]);

  useEffect(() => {
    const isPregame = ['S', 'P'].includes(gameData.status);
    const isGameOrLater = ['L', 'F', 'PW'].includes(gameData.status);

    if (isPregame && (openTab === '' || openTab === 'game')) {
      setOpenTab('preview');
    } else if (isGameOrLater && (openTab === '' || openTab === 'preview')) {
      setOpenTab('game');
    }
  }, [gameData, openTab]);

  return (
    <div className="page player-page">
      <div className="main-content">
        <div className={`player-wrapper ${feedType}`}>
          {stream.url === '' && (
            <div className="player-wait">
              <Image
                src="https://i.imgur.com/lKhS5pj.jpeg"
                alt="MLB Underground"
                fill
                sizes="100vw"
                style={{ objectFit: 'cover' }}
              />
              <div className="wait-message">
                {streamErrors !== '' && <span>{streamErrors}!</span>}
                {streamErrors === '' && attempts < 5 && <span>Searching for stream...</span>}
                {streamErrors === '' && attempts >= 5 && (
                  <span>
                    The stream may not be active yet
                    <br /> but I&apos;m still searching...
                  </span>
                )}
              </div>
            </div>
          )}
          {stream.url !== '' && <VideoPlayer url={stream.url} feedType={feedType} />}
        </div>
        <Linescore gameData={gameData} />
      </div>

      <div className="sidebar">
        {loaded && (
          <div className="sidebar-inner">
            <div className="tabs">
              {['S', 'P'].includes(gameData.status) && (
                <div
                  tabIndex={0}
                  role="tab"
                  key="preview"
                  className={openTab === 'preview' ? 'active' : ''}
                  onClick={() => setOpenTab('preview')}
                >
                  Preview
                </div>
              )}
              {['F', 'PW', 'L'].includes(gameData.status) && (
                <div
                  tabIndex={0}
                  role="tab"
                  key="game"
                  className={openTab === 'game' ? 'active' : ''}
                  onClick={() => setOpenTab('game')}
                >
                  Game
                </div>
              )}
              <div
                tabIndex={0}
                role="tab"
                key="home"
                className={openTab === 'home' ? 'active' : ''}
                onClick={() => setOpenTab('home')}
              >
                {gameData.teams.home.name}
              </div>
              <div
                tabIndex={0}
                role="tab"
                key="away"
                className={openTab === 'away' ? 'active' : ''}
                onClick={() => setOpenTab('away')}
              >
                {gameData.teams.away.name}
              </div>
            </div>
            <div className="tab-contents">
              {openTab === 'preview' && <Preview preview={gameData.preview} />}

              {openTab === 'game' && (
                <div>
                  {['PW', 'L'].includes(gameData.status) && <Matchup matchup={gameData.matchup} />}
                  {['F'].includes(gameData.status) && <Wrap wrap={gameData.wrap} />}
                  <Events events={gameData.events} />
                </div>
              )}
              {openTab === 'away' && <Roster team={gameData.teams.away} />}
              {openTab === 'home' && <Roster team={gameData.teams.home} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Player;
