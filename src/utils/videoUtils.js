// src/utils/videoUtils.js

/**
 * Transforms various video URLs into a usable embed URL.
 * @param {string} url The original video URL from any source.
 * @returns {{url: string, type: 'iframe' | 'video'} | null} An object with the embeddable URL and the type of player, or null if not embeddable.
 */
export const getVideoEmbedUrl = (url) => {
  if (!url) return null;

  // YouTube
  const youtubeRegex = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([^?&\n]+)/;
  const youtubeMatch = url.match(youtubeRegex);
  if (youtubeMatch && youtubeMatch[1]) {
    return { url: `https://www.youtube-nocookie.com/embed/${youtubeMatch[1]}`, type: 'iframe' };
  }

  // Google Drive
  const driveRegex = /drive\.google\.com\/file\/d\/([^/]+)/;
  const driveMatch = url.match(driveRegex);
  if (driveMatch && driveMatch[1]) {
    return { url: `https://drive.google.com/file/d/${driveMatch[1]}/preview`, type: 'iframe' };
  }

  // OneDrive - THIS IS THE FIX
  if (url.includes('onedrive.live.com')) {
    // Transform a standard share URL (which contains /redir?) into an embed URL
    const embedUrl = url.replace('/redir?', '/embed?');
    return { url: embedUrl, type: 'iframe' };
  }

  // Direct MP4 Link (from Vercel Blob, etc.)
  if (url.endsWith('.mp4')) {
    return { url, type: 'video' };
  }

  // If no match, we can't embed it
  return null;
};