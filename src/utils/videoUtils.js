// src/utils/videoUtils.js

/**
 * Transforms various video URLs into a usable embed URL.
 * @param {string} url The original video URL or ID from any source.
 * @returns {{url: string, type: 'iframe' | 'video'} | null} An object with the embeddable URL and the type of player, or null if not embeddable.
 */
export const getVideoDetails = (url) => {
  if (!url) return null;

  const trimmedUrl = url.trim();
  const hostname = window.location.hostname;

  // 1. Check for full YouTube URLs first.
  const ytUrlRegex = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([^?&\n]+)/;
  const ytMatch = trimmedUrl.match(ytUrlRegex);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1].substring(0, 11);
    return { url: `https://www.youtube-nocookie.com/embed/${videoId}`, type: 'iframe' };
  }

  // 2. [NEW FIX] Check for a raw YouTube ID *anywhere* in the string.
  // This is much more forgiving than the previous logic.
  const rawIdMatch = trimmedUrl.match(/([a-zA-Z0-9_-]{11})/);
  if (rawIdMatch && rawIdMatch[1]) {
    const videoId = rawIdMatch[1];
    return { url: `https://www.youtube-nocookie.com/embed/${videoId}`, type: 'iframe' };
  }
  
  // 3. Check for other parsable URLs (Twitch, Drive, etc.)
  if (trimmedUrl.startsWith('http')) {
    try {
      const urlObject = new URL(trimmedUrl);

      // Twitch
      if (urlObject.hostname.includes('twitch.tv')) {
        const pathParts = urlObject.pathname.split('/').filter(Boolean);
        if (pathParts[0] === 'videos') { // VOD
          return { url: `https://player.twitch.tv/?video=${pathParts[1]}&parent=${hostname}&autoplay=false`, type: 'iframe' };
        }
        if (pathParts[0] === 'clip' || (pathParts.length > 1 && pathParts[1] === 'clip')) {
           const clipId = pathParts[pathParts.length - 1];
           return { url: `https://clips.twitch.tv/embed?clip=${clipId}&parent=${hostname}&autoplay=false`, type: 'iframe' };
        }
      }

      // Google Drive
      if (urlObject.hostname.includes('drive.google.com')) {
        const match = trimmedUrl.match(/drive\.google\.com\/file\/d\/([^/]+)/);
        if (match && match[1]) {
          return { url: `https://drive.google.com/file/d/${match[1]}/preview`, type: 'iframe' };
        }
      }

      // OneDrive
      if (urlObject.hostname.includes('onedrive.live.com')) {
        if (trimmedUrl.includes('/embed?')) {
          return { url: trimmedUrl, type: 'iframe' };
        }
        if (trimmedUrl.includes('/redir?')) {
          return { url: trimmedUrl.replace('/redir?', '/embed?'), type: 'iframe' };
        }
      }

      // Direct MP4 Link
      if (urlObject.pathname.endsWith('.mp4')) {
        return { url: trimmedUrl, type: 'video' };
      }

    } catch (error) {
      console.error("Could not parse video URL:", trimmedUrl, error);
      return null;
    }
  }

  // 4. If all checks fail
  return null;
};
