/**
 * Extracts the video ID from a YouTube URL.
 */
function getYouTubeId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

/**
 * [FIX] Generates a privacy-enhanced (nocookie) embeddable URL for a YouTube video.
 * @param {string} videoId - The YouTube video ID.
 * @returns {string} The embeddable URL.
 */
function getYouTubeEmbedUrl(videoId) {
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}

/**
 * Extracts the file ID from a Google Drive URL.
 */
function getGoogleDriveId(url) {
  const regExp = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
  const match = url.match(regExp);
  return (match && match[1]) ? match[1] : null;
}

/**
 * Generates an embeddable URL for a Google Drive video.
 * @param {string} fileId - The Google Drive file ID.
 * @returns {string} The embeddable URL.
 */
function getGoogleDriveEmbedUrl(fileId) {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

/**
 * Extracts the clip ID from a Medal.tv URL.
 */
function getMedalClipId(url) {
  // Matches .../clips/CLIP_ID/... or /clip/embed/CLIP_ID
  const regExp = /medal\.tv\/(?:games\/[^\/]+\/clips|clip\/embed)\/([a-zA-Z0-9_-]+)/;
  const match = url.match(regExp);
  return (match && match[1]) ? match[1] : null;
}

/**
 * Main function to get an embed URL from any supported video link.
 * @param {string} url - The original video URL.
 * @returns {string|null} The embeddable URL or null if unsupported.
 */
export function getEmbedUrl(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // This is required for Twitch embeds
  const parentDomain = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

  try {
    const { host, pathname, searchParams } = new URL(url);

    // 1. YouTube (NoCookie)
    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      const videoId = getYouTubeId(url);
      return videoId ? getYouTubeEmbedUrl(videoId) : null;
    }

    // 2. Google Drive
    if (host.includes('drive.google.com')) {
      const fileId = getGoogleDriveId(url);
      return fileId ? getGoogleDriveEmbedUrl(fileId) : null;
    }
    
    // 3. OneDrive
    if (host.includes('onedrive.live.com')) {
      const resid = searchParams.get('resid');
      const authkey = searchParams.get('authkey');
      if (resid && authkey) {
        // If it's already an embed link, use it directly
        if (pathname.includes('/embed')) {
            return url; 
        }
        // Otherwise, construct the embed link
        return `https://onedrive.live.com/embed?resid=${resid}&authkey=${authkey}`;
      }
    }

    // 4. Medal.tv
    if (host.includes('medal.tv')) {
      const clipId = getMedalClipId(url);
      return clipId ? `https://medal.tv/clip/embed/${clipId}` : null;
    }

    // 5. Twitch (Clips and VODs)
    if (host.includes('twitch.tv')) {
      // Handle Clips: clips.twitch.tv/ID or twitch.tv/USER/clip/ID
      const clipMatch = url.match(/clips\.twitch\.tv\/([a-zA-Z0-9_-]+)|twitch\.tv\/[^\/]+\/clip\/([a-zA-Z0-9_-]+)|twitch\.tv\/clips\/([a-zA-Z0-9_-]+)/);
      if (clipMatch) {
        const clipId = clipMatch[1] || clipMatch[2] || clipMatch[3];
        return `https://clips.twitch.tv/embed?clip=${clipId}&parent=${parentDomain}`;
      }

      // Handle VODs: twitch.tv/videos/ID
      const videoMatch = url.match(/twitch\.tv\/videos\/(\d+)/);
      if (videoMatch) {
        const videoId = videoMatch[1];
        return `https://player.twitch.tv/?video=${videoId}&parent=${parentDomain}`;
      }
    }

  } catch (error) {
    console.error("Invalid URL for embedding:", url, error);
    return null;
  }

  // Return null if no provider matched
  console.warn("Unsupported video URL:", url);
  return null;
}