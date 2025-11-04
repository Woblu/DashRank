// src/components/YouTubeThumbnail.jsx
import React, { useState, useEffect } from 'react';
import { Play } from 'lucide-react'; // Assuming you have lucide-react from other files

// An ordered list of thumbnail qualities to try, from best to worst.
const thumbnailQualities = [
  'maxresdefault.jpg',
  'sddefault.jpg',
  'hqdefault.jpg',
  'mqdefault.jpg',
  'default.jpg',
];

/**
 * [FIX] Extracts the video ID *only* from a YouTube URL.
 * Returns null if the URL is not a valid YouTube link.
 */
function getYouTubeId(url) {
  if (!url || typeof url !== 'string') return null;
  
  // Check for YouTube domains
  if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
    return null;
  }
  
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  
  if (match && match[2].length === 11) {
    return match[2];
  }
  
  return null;
}

export default function YouTubeThumbnail({ videoUrl, altText, className }) {
  const [currentQualityIndex, setCurrentQualityIndex] = useState(0);
  const [videoId, setVideoId] = useState(null);
  const [imgSrc, setImgSrc] = useState(null);
  const [isYouTube, setIsYouTube] = useState(false);

  // Reset the image source if the videoUrl prop changes
  useEffect(() => {
    const id = getYouTubeId(videoUrl);
    if (id) {
      setVideoId(id);
      setIsYouTube(true);
      setCurrentQualityIndex(0);
      setImgSrc(`https://img.youtube.com/vi/${id}/${thumbnailQualities[0]}`);
    } else {
      setIsYouTube(false);
      setVideoId(null);
      setImgSrc(null); // Will trigger the fallback
    }
  }, [videoUrl]);
  
  const handleError = () => {
    // Only try next quality if it's a YouTube video
    if (isYouTube) {
      const nextQualityIndex = currentQualityIndex + 1;
      if (nextQualityIndex < thumbnailQualities.length) {
        setCurrentQualityIndex(nextQualityIndex);
        setImgSrc(`https://img.youtube.com/vi/${videoId}/${thumbnailQualities[nextQualityIndex]}`);
      } else {
        // If all qualities have failed, show a final placeholder.
        setImgSrc('https://placehold.co/160x90/1e293b/ffffff?text=Invalid');
      }
    }
    // If not YouTube, erroring will just lead to the final placeholder
  };

  if (!isYouTube || !imgSrc) {
    // Fallback for non-YouTube links (Google Drive, etc.) or if videoId is missing
    return (
        <div className={`aspect-video w-full bg-gray-900 rounded-lg overflow-hidden relative group flex items-center justify-center ${className || ''}`}>
          <Play size={48} className="text-gray-600" />
        </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={altText}
      className={className}
      onError={handleError}
    />
  );
}