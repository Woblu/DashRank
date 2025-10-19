// src/utils/embedUtils.js

export const getYoutubeEmbed = (urlOrId) => {
  console.log('[embedUtils] Received input:', urlOrId); // Log initial input
  if (!urlOrId) {
      console.log('[embedUtils] Input is null or empty, returning null.');
      return null;
  }

  const trimmedInput = String(urlOrId).trim(); // Ensure it's a string before trimming
  console.log('[embedUtils] Trimmed input:', trimmedInput);

  // 1. Check for full YouTube URLs.
  const urlRegex = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([^?&\n]+)/;
  const urlMatch = trimmedInput.match(urlRegex);
  
  if (urlMatch && urlMatch[1]) {
    const videoId = urlMatch[1].substring(0, 11);
    console.log('[embedUtils] Matched full URL, extracted ID:', videoId);
    return { url: `https://www.youtube-nocookie.com/embed/${videoId}`, type: 'iframe' };
  } else {
      console.log('[embedUtils] Did not match full URL regex.');
  }

  // 2. Check for a raw 11-character ID.
  const rawIdRegex = /^[a-zA-Z0-9_-]{11}$/;
  if (rawIdRegex.test(trimmedInput)) {
     console.log('[embedUtils] Matched raw ID regex:', trimmedInput);
     return { url: `https://www.youtube-nocookie.com/embed/${trimmedInput}`, type: 'iframe' };
  } else {
      console.log('[embedUtils] Did not match raw ID regex.');
  }
  
  // 3. Fallback check (less strict)
  if (typeof trimmedInput === 'string' && trimmedInput.length >= 11) {
    const videoId = trimmedInput.substring(0, 11);
     if (/^[a-zA-Z0-9_-]+$/.test(videoId)) { 
        console.log('[embedUtils] Matched fallback (substring):', videoId);
        return { url: `https://www.youtube-nocookie.com/embed/${videoId}`, type: 'iframe' };
     } else {
         console.log('[embedUtils] Fallback substring failed basic ID check.');
     }
  } else {
       console.log('[embedUtils] Input too short for fallback.');
  }

  // 4. If nothing matches
  console.warn(`[embedUtils] All checks failed for input: "${trimmedInput}", returning null.`);
  return null;
};