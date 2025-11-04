// src/utils/embedUtils.js

/**
 * [FIX] Extracts the video ID from a YouTube URL, now including /live/ and /shorts/ links.
 */
function getYouTubeId(url) {
  // Regex updated to include /live/ and /shorts/ paths
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|\/live\/|\/shorts\/)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

/**
 * Generates a privacy-enhanced (nocookie) embeddable URL for a YouTube video.
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
 */
function getGoogleDriveEmbedUrl(fileId) {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

/**
 * Extracts the clip ID from a Medal.tv URL.
 */
function getMedalClipId(url) {
  const regExp = /medal\.tv\/(?:games\/[^\/]+\/clips|clip\/embed)\/([a-zA-Z0-9_-]+)/;
  const match = url.match(regExp);
  return (match && match[1]) ? match[1] : null;
}

/**
 * Main function to get an embed URL object from any supported video link.
 * @param {string} url - The original video URL or ID.
 * @returns {{url: string, type: 'iframe' | 'video'}|null} The embeddable URL object or null if unsupported.
 */
export function getEmbedUrl(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const parentDomain = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

  try {
    // This is the main check.
    // Try to parse the input as a full URL.
    const { host, pathname, searchParams } = new URL(url);

    // --- IF IT IS A FULL URL, The existing logic runs ---

    // 1. YouTube
    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      const videoId = getYouTubeId(url); // This function is now fixed
      return videoId ? { url: getYouTubeEmbedUrl(videoId), type: 'iframe' } : null;
    }

    // 2. Google Drive
    if (host.includes('drive.google.com')) {
      const fileId = getGoogleDriveId(url);
      return fileId ? { url: getGoogleDriveEmbedUrl(fileId), type: 'iframe' } : null;
    }
    
    // 3. OneDrive
    if (host.includes('onedrive.live.com')) {
      const resid = searchParams.get('resid');
      const authkey = searchParams.get('authkey');
      if (resid && authkey) {
        const embedUrl = pathname.includes('/embed') ? url : `https://onedrive.live.com/embed?resid=${resid}&authkey=${authkey}`;
        return { url: embedUrl, type: 'iframe' };
      }
    }

    // 4. Medal.tv
    if (host.includes('medal.tv')) {
      const clipId = getMedalClipId(url);
      return clipId ? { url: `https://medal.tv/clip/embed/${clipId}`, type: 'iframe' } : null;
    }

    // 5. Twitch
    if (host.includes('twitch.tv')) {
      const clipMatch = url.match(/clips\.twitch\.tv\/([a-zA-Z0-9_-]+)|twitch\.tv\/[^\/]+\/clip\/([a-zA-Z0-9_-]+)|twitch\.tv\/clips\/([a-zA-Z0-9_-]+)/);
      if (clipMatch) {
        const clipId = clipMatch[1] || clipMatch[2] || clipMatch[3];
        return { url: `https://clips.twitch.tv/embed?clip=${clipId}&parent=${parentDomain}`, type: 'iframe' };
      }
      const videoMatch = url.match(/twitch\.tv\/videos\/(\d+)/);
      if (videoMatch) {
        const videoId = videoMatch[1];
        return { url: `https://player.twitch.tv/?video=${videoId}&parent=${parentDomain}`, type: 'iframe' };
      }
    }
    
    // 6. Direct Video Files
    if (url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.ogg')) {
        return { url: url, type: 'video' };
    }

  } catch (error) {
    // --- IF IT IS NOT A FULL URL, It fails and lands here. ---
    
    // Check if it looks like a YouTube ID (11 chars, no slashes or spaces)
    const ytIdRegex = /^[a-zA-Z0-9_-]{11}$/;
    if (ytIdRegex.test(url)) {
      // It's a YouTube ID.
      return { url: getYouTubeEmbedUrl(url), type: 'iframe' };
    }
    
    // It's not a URL and not a YouTube ID.
    console.error(`Invalid URL or ID for embedding: ${url}`, error);
    return null;
  }

  // Return null if it was a valid URL but no provider matched
  console.warn("Unsupported video URL:", url);
  return null;
}