// src/utils/embedUtils.js

/**
 * Transforms a YouTube URL or ID into a usable embed URL.
 * @param {string} urlOrId The original video URL or ID.
 * @returns {{url: string, type: 'iframe'} | null} An object with the embeddable URL, or null if not embeddable.
 */
export const getYoutubeEmbed = (urlOrId) => { // Renamed function
  if (!urlOrId) return null;

  const trimmedInput = urlOrId.trim();

  // 1. Check for full YouTube URLs.
  const urlRegex = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([^?&\n]+)/;
  const urlMatch = trimmedInput.match(urlRegex);
  
  if (urlMatch && urlMatch[1]) {
    const videoId = urlMatch[1].substring(0, 11); 
    return { url: `https://www.youtube-nocookie.com/embed/${videoId}`, type: 'iframe' };
  }

  // 2. Check for a raw 11-character ID.
  const rawIdRegex = /^[a-zA-Z0-9_-]{11}$/;
  if (rawIdRegex.test(trimmedInput)) {
     return { url: `https://www.youtube-nocookie.com/embed/${trimmedInput}`, type: 'iframe' };
  }
  
  // 3. Fallback check (less strict): grab first 11 chars if others fail
  if (typeof trimmedInput === 'string' && trimmedInput.length >= 11) {
    const videoId = trimmedInput.substring(0, 11);
     // Basic check to ensure it looks like a video ID, prevents embedding random strings
     if (/^[a-zA-Z0-9_-]+$/.test(videoId)) { 
        return { url: `https://www.youtube-nocookie.com/embed/${videoId}`, type: 'iframe' };
     }
  }

  // 4. If nothing matches
  console.warn(`[embedUtils.js] Could not parse YouTube ID from: "${trimmedInput}"`); // Added warning
  return null;
};