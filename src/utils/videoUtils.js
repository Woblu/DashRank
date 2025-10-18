// src/utils/videoUtils.js

/**
 * Transforms various video URLs into a usable embed URL.
 * @param {string} url The original video URL from any source.
 *GN_
 * @returns {{url: string, type: 'iframe' | 'video'} | null} An object with the embeddable URL and the type of player, or null if not embeddable.
 */
export const getVideoDetails = (url) => {
  if (!url) return null;

  const trimmedUrl = url.trim();
  const hostname = window.location.hostname;

  // [FIX] Using the more forgiving logic from LevelCard.jsx

  // 1. Check for full YouTube URLs.
  const ytUrlRegex = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([^?&\n]+)/;
  const ytMatch = trimmedUrl.match(ytUrlRegex);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1].substring(0, 11);
    return { url: `https://www.youtube-nocookie.com/embed/${videoId}`, type: 'iframe' };
  }

  // 2. Check for other parsable URLs (Twitch, Drive, etc.)
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
    }
  }

  // 3. Fallback: Assume it's a raw ID if it's at least 11 chars long
  if (trimmedUrl.length >= 11) {
    const videoId = trimmedUrl.substring(0, 11);
    return { url: `https://www.youtube-nocookie.com/embed/${videoId}`, type: 'iframe' };
  }
  
  // 4. If all checks fail
  return null;
};
