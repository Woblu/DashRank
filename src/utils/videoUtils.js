// src/utils/videoUtils.js

/**
 * Transforms various video URLs into a usable embed URL.
 * @param {string} url The original video URL from any source.
 * @returns {{url: string, type: 'iframe' | 'video'} | null} An object with the embeddable URL and the type of player, or null if not embeddable.
 */
export const getVideoDetails = (url) => {
  if (!url) return null;

  const hostname = window.location.hostname;

  // 1. Check for full YouTube URLs (like the logic in LevelCard.jsx)
  const ytUrlRegex = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([^?&\n]+)/;
  const ytMatch = url.match(ytUrlRegex);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1].substring(0, 11);
    return { url: `https://www.youtube-nocookie.com/embed/${videoId}`, type: 'iframe' };
  }

  // 2. Check for raw 11-character YouTube ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return { url: `https://www.youtube-nocookie.com/embed/${url}`, type: 'iframe' };
  }

  // 3. Try to parse as a URL for other services (Twitch, Drive, etc.)
  try {
    const urlObject = new URL(url);

    // Twitch
    if (urlObject.hostname.includes('twitch.tv')) {
      const pathParts = urlObject.pathname.split('/').filter(Boolean);
      if (pathParts[0] === 'videos') { // VOD
        return { url: `https://player.twitch.tv/?video=${pathParts[1]}&parent=${hostname}&autoplay=false`, type: 'iframe' };
      }
      // Check for clip URLs (e.g., twitch.tv/user/clip/ID or clips.twitch.tv/ID)
      if (pathParts[0] === 'clip' || (pathParts.length > 1 && pathParts[1] === 'clip')) {
         const clipId = pathParts[pathParts.length - 1];
         return { url: `https://clips.twitch.tv/embed?clip=${clipId}&parent=${hostname}&autoplay=false`, type: 'iframe' };
      }
    }

    // Google Drive
    if (urlObject.hostname.includes('drive.google.com')) {
      const match = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
      if (match && match[1]) {
        return { url: `https://drive.google.com/file/d/${match[1]}/preview`, type: 'iframe' };
      }
    }

    // OneDrive
    if (urlObject.hostname.includes('onedrive.live.com')) {
      if (url.includes('/embed?')) {
        return { url, type: 'iframe' }; // Already an embed link
      }
      if (url.includes('/redir?')) {
        return { url: url.replace('/redir?', '/embed?'), type: 'iframe' };
      }
    }

    // Direct MP4 Link (from Vercel Blob, etc.)
    if (urlObject.pathname.endsWith('.mp4')) {
      return { url, type: 'video' };
    }

  } catch (error) {
    // This will catch if the URL is invalid AND not a YouTube ID
    console.error("Could not parse video URL:", url, error);
    return null;
  }

  // 4. If no match at all
  return null;
};
