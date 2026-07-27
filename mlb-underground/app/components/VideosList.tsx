'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { VideoClip } from '@/lib/videos';

const titleCase = (str: string) =>
  str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.substring(1))
    .join(' ');

const dateLabel = (date: string) => {
  const d = new Date(date + 'T00:00:00');
  return isNaN(d.getTime()) ? '' : format(d, 'EEEE, LLLL d');
};

const VideosList = ({ slug }: { slug: string }) => {
  const search = titleCase(slug.replace(/-/g, ' '));
  const [pages, setPages] = useState<VideoClip[][]>([]);
  const [page, setPage] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    document.title = 'MLB Underground - Videos - ' + search;
  }, [search]);

  const fetchPage = useCallback(
    async (p: number) => {
      try {
        const res = await fetch('/api/videos/search?q=' + encodeURIComponent(search) + '&page=' + p);
        const data = await res.json();
        setPages((prev) => {
          const next = [...prev];
          next[p] = data.videos || [];
          return next;
        });
      } catch {
        // ignore
      } finally {
        setLoaded(true);
      }
    },
    [search]
  );

  useEffect(() => {
    fetchPage(page);
  }, [page, fetchPage]);

  return (
    <div className="page videos-page">
      <h1>Videos: {search}</h1>
      {loaded && (
        <div className="videos">
          {pages.map((clips, index) => (
            <div key={index} className="video-page">
              {clips.map((video) => (
                <div key={video.id} className="video">
                  <Link href={`/video/${slug}/${video.slug}`}>
                    <div>
                      <Image
                        src={video.image}
                        alt=""
                        width={500}
                        height={281}
                        sizes="(max-width: 600px) 100vw, 25vw"
                        style={{ width: '100%', height: 'auto' }}
                      />
                    </div>
                    <h2>{video.title}</h2>
                    <h3>{dateLabel(video.date)}</h3>
                    <p>{video.description}</p>
                    <div className="duration">{video.duration}</div>
                  </Link>
                </div>
              ))}
            </div>
          ))}
          <div className="video-more">
            <button onClick={() => setPage(page + 1)}>Load More Videos</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideosList;
