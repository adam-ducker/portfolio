'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { VideoClip, ClipDetail } from '@/lib/videos';

const VideoPlayer = dynamic(() => import('./VideoPlayer'), { ssr: false });

type VideoViewProps = {
  keywords: string;
  slug: string;
};

const VideoView = ({ keywords, slug }: VideoViewProps) => {
  const search = keywords.replace(/-/g, ' ');
  const [clip, setClip] = useState<ClipDetail | null>(null);
  const [related, setRelated] = useState<VideoClip[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/videos/clip?slug=' + encodeURIComponent(slug));
        const data = await res.json();
        if (!cancelled && data && data.url) {
          setClip(data);
          document.title = 'MLB Underground - ' + data.title;
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/videos/search?q=' + encodeURIComponent(search) + '&limit=36');
        const data = await res.json();
        if (!cancelled) {
          setRelated(data.videos || []);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [search]);

  return (
    <div className="page video-page">
      <div className="main-content">
        {clip && clip.url && (
          <div className="video-wrapper">
            <VideoPlayer url={clip.url} poster={clip.poster} dvr={false} />
            <div className="video-details">
              <h2>{clip.title}</h2>
              <div className="video-description">{clip.description}</div>
            </div>
          </div>
        )}
      </div>

      <div className="sidebar">
        {related.length > 0 && (
          <div className="sidebar-inner">
            <h2>More From: {search}</h2>
            <div>
              {related.map((video) => (
                <div key={video.id} className="video">
                  <Link href={`/video/${keywords}/${video.slug}`}>
                    <div>
                      <Image
                        src={video.image}
                        alt=""
                        width={500}
                        height={281}
                        sizes="(max-width: 1000px) 100vw, 445px"
                        style={{ width: '100%', height: 'auto' }}
                      />
                    </div>
                    <h2>{video.title}</h2>
                    <div className="duration">{video.duration}</div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoView;
