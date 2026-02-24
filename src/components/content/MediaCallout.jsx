function extractYouTubeId(url) {
  if (!url) return null;
  // Handle youtu.be/ID and youtube.com/watch?v=ID formats
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (shortMatch) return shortMatch[1];
  const longMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (longMatch) return longMatch[1];
  // Handle youtube.com/embed/ID format (already an embed URL)
  const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
  if (embedMatch) return embedMatch[1];
  return null;
}

function extractSpotifyEmbed(url) {
  if (!url) return null;
  const match = url.match(/open\.spotify\.com\/(track|album)\/([a-zA-Z0-9]+)/);
  if (match) return `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator&theme=0`;
  return null;
}

export default function MediaCallout({ media_type, url, title, context, timestamp }) {
  if (!media_type || !url) return null;

  if (media_type === 'youtube') {
    const videoId = extractYouTubeId(url);
    if (!videoId) return null;

    let embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
    if (timestamp) embedUrl += `&start=${timestamp}`;

    return (
      <div>
        <div style={{ position: 'relative', paddingTop: '56.25%', background: '#000', borderRadius: 8, overflow: 'hidden' }}>
          <iframe
            src={embedUrl}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            title={title || 'YouTube video'}
          />
        </div>
        {title && <p style={{ margin: '8px 0 0', fontWeight: 600 }}>{title}</p>}
        {context && <p style={{ margin: '4px 0 0', opacity: 0.7 }}>{context}</p>}
      </div>
    );
  }

  if (media_type === 'spotify') {
    const embedUrl = extractSpotifyEmbed(url);
    if (!embedUrl) return null;

    return (
      <div>
        <iframe
          src={embedUrl}
          width="100%"
          height="152"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          title={title || 'Spotify embed'}
          style={{ borderRadius: 8 }}
        />
        {title && <p style={{ margin: '8px 0 0', fontWeight: 600 }}>{title}</p>}
        {context && <p style={{ margin: '4px 0 0', opacity: 0.7 }}>{context}</p>}
      </div>
    );
  }

  if (media_type === 'article') {
    return (
      <div>
        <a href={url} target="_blank" rel="noopener noreferrer">
          {title || url}
        </a>
        {context && <p style={{ margin: '4px 0 0', opacity: 0.7 }}>{context}</p>}
      </div>
    );
  }

  return null;
}
