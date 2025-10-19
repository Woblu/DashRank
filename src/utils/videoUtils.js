// src/utils/videoUtils.js

/**
 * Transforms a YouTube URL or ID into a usable embed URL.
 * @param {string} urlOrId The original video URL or ID.
 * @returns {{url: string, type: 'iframe'} | null} An object with the embeddable URL, or null if not embeddable.
 */
export const getVideoDetails = (urlOrId) => {
  if (!urlOrId) return null;

  const trimmedInput = urlOrId.trim();

  // 1. Check for full YouTube URLs.
  // Example: https://www.youtube.com/watch?v=CELNmHwln_c
  const urlRegex = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([^?&\n]+)/;
  const urlMatch = trimmedInput.match(urlRegex);
  
  if (urlMatch && urlMatch[1]) {
    const videoId = urlMatch[1].substring(0, 11); // Get the 11-character ID
    return { url: `https://www.youtube-nocookie.com/embed/${videoId}`, type: 'iframe' };
  }

  // 2. Check for a raw 11-character ID.
  // Example: CELNmHwln_c
  // This regex ^...$ ensures the *entire string* is a valid ID.
  const rawIdRegex = /^[a-zA-Z0-9_-]{11}$/;
  if (rawIdRegex.test(trimmedInput)) {
     return { url: `https://www.youtube-nocookie.com/embed/${trimmedInput}`, type: 'iframe' };
  }
  
  // 3. If it's not a valid YouTube URL or raw ID, it fails.
  return null;
};
