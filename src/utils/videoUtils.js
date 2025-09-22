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

  // OneDrive
  if (url.includes('1drv.ms') || url.includes('onedrive.live.com')) {
    // OneDrive embed URLs are typically direct links ending with ...&download=1 or can be transformed
    // A simplified approach is to try embedding directly. More complex logic might be needed for all URL types.
    // For now, let's assume a direct embeddable link format for OneDrive.
    let embedUrl = url;
    if (url.includes('?')) {
        embedUrl += '&';
    } else {
        embedUrl += '?';
    }
    embedUrl += 'ithint=video,mp4'; // Hint for content type
    return { url: embedUrl, type: 'iframe'}; // Attempt to embed OneDrive, may vary based on share link type
  }

  // Direct MP4 Link (from Vercel Blob, etc.)
  if (url.endsWith('.mp4')) {
    return { url, type: 'video' };
  }

  // If no match, we can't embed it
  return null;
};