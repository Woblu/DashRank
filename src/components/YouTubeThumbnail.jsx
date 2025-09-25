import React, { useState, useEffect } from 'react';

// An ordered list of thumbnail qualities to try, from best to worst.
const thumbnailQualities = [
  'maxresdefault.jpg',
  'sddefault.jpg',
  'hqdefault.jpg',
  'mqdefault.jpg',
  'default.jpg',
];

export default function YouTubeThumbnail({ videoId, altText, className }) {
  const [currentQualityIndex, setCurrentQualityIndex] = useState(0);
  const [imgSrc, setImgSrc] = useState(
    videoId ? `https://img.youtube.com/vi/${videoId}/${thumbnailQualities[0]}` : null
  );

  // Reset the image source if the videoId prop changes
  useEffect(() => {
    setCurrentQualityIndex(0);
    setImgSrc(videoId ? `https://img.youtube.com/vi/${videoId}/${thumbnailQualities[0]}` : null);
  }, [videoId]);
  
  const handleError = () => {
    // If the current thumbnail fails, try the next one in the list.
    const nextQualityIndex = currentQualityIndex + 1;
    if (nextQualityIndex < thumbnailQualities.length) {
      setCurrentQualityIndex(nextQualityIndex);
      setImgSrc(`https://img.youtube.com/vi/${videoId}/${thumbnailQualities[nextQualityIndex]}`);
    } else {
      // If all qualities have failed, show a final placeholder.
      setImgSrc('https://placehold.co/160x90/1e293b/ffffff?text=Invalid');
    }
  };

  if (!videoId) {
    return (
      <img
        src={'https://placehold.co/160x90/1e293b/ffffff?text=No+Thumb'}
        alt={altText}
        className={className}
      />
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
