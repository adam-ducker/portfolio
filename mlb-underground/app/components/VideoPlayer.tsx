'use client';

import { useEffect, useRef } from 'react';
import videojs from 'video.js';
import dvr from 'videojs-dvr';

// Ported from the React app. Loaded via next/dynamic({ ssr: false }) in the
// Player, so video.js only runs in the browser. video-js.css is imported in the
// root layout.
type VideoPlayerProps = {
  url: string;
  feedType?: string;
  poster?: string;
  dvr?: boolean;
};

const VideoPlayer = (props: VideoPlayerProps) => {
  const videoRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any | null>(null);

  const { url, poster = '/baseball.jpeg', dvr: enableDvr = true } = props;

  useEffect(() => {
    if (!playerRef.current) {
      if (enableDvr && !videojs.getPlugins().dvr) {
        videojs.registerPlugin('dvr', dvr);
      }

      const videoElement = document.createElement('video-js');
      videoElement.classList.add('vjs-big-play-centered');

      if (videoRef.current) {
        videoRef.current.appendChild(videoElement);
      }

      const videoJsOptions = {
        autoplay: true,
        controls: true,
        responsive: true,
        fluid: true,
        experimentalSvgIcons: true,
        poster,
        sources: [
          {
            src: url,
            type: 'application/x-mpegURL',
          },
        ],
        plugins: enableDvr ? { dvr: {} } : {},
      };

      const player = (playerRef.current = videojs(videoElement, videoJsOptions, () => {}));

      player.on('loadedmetadata', () => {
        const tracks = player.remoteTextTracks();
        for (let i = 0; i < tracks.length; i++) {
          tracks[i].mode = 'hidden';
        }
      });

      player.on('ready', () => {
        player.volume(parseFloat(localStorage.getItem('player-volume') || '0.5'));
      });

      player.on('volumechange', () => {
        localStorage.setItem('player-volume', player.volume() + '' || '0.5');
      });
    }
    // Initialize the Video.js player once, from the props present on mount.
    // `poster` and `enableDvr` are intentionally read at init only — the
    // `!playerRef.current` guard already prevents re-initialization — so we
    // don't want them in the dependency array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoRef, url]);

  // Dispose the Video.js player when the component unmounts.
  useEffect(() => {
    const player = playerRef.current;
    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, [playerRef]);

  return (
    <div data-vjs-player>
      <div ref={videoRef} />
    </div>
  );
};

export default VideoPlayer;
