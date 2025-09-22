// src/utils/videoUtils.js

/**
 * Transforms various video URLs into a usable embed URL.
 * @param {string} url The original video URL from any source.
 * @param {string} hostname The hostname of your website (e.g., 'dashrank.vercel.app').
 * @returns {{url: string, type: 'iframe' | 'video'} | null} An object with the embeddable URL and the type of player, or null if not embeddable.
 */
export const getVideoEmbedUrl = (url, hostname) => {
  if (!url) return null;

  try {
    const urlObject = new URL(url);

    // YouTube
    if (urlObject.hostname.includes('youtube.com') || urlObject.hostname.includes('youtu.be')) {
      const videoId = urlObject.searchParams.get('v') || urlObject.pathname.split('/').pop();
      if (videoId) {
        return { url: `https://www.youtube-nocookie.com/embed/${videoId}`, type: 'iframe' };
      }
    }

    // Twitch
    if (urlObject.hostname.includes('twitch.tv')) {
      const pathParts = urlObject.pathname.split('/').filter(Boolean);
      if (pathParts[0] === 'videos') { // VOD
        return { url: `https://player.twitch.tv/?video=${pathParts[1]}&parent=${hostname}&autoplay=false`, type: 'iframe' };
      }
      if (pathParts.length === 2) { // Clip (e.g., twitch.tv/user/clip/ID)
        return { url: `https://clips.twitch.tv/embed?clip=${pathParts[2]}&parent=${hostname}&autoplay=false`, type: 'iframe' };
      }
      if (pathParts[0].includes('clip')) { // Clip shorthand (e.g., clips.twitch.tv/ID)
        return { url: `https://clips.twitch.tv/embed?clip=${pathParts[1]}&parent=${hostname}&autoplay=false`, type: 'iframe' };
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
    console.error("Could not parse URL:", url, error);
    return null;
  }

  // If no match, we can't embed it
  return null;
};