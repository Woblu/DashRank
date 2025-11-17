// src/components/LayoutCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Tag, User } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

// [FIX] Add this map for display names
const tagDisplayNames = {
  'WAVE': 'Wave',
  'SHIP': 'Ship',
  'TIMING': 'Timing',
  'MEMORY': 'Memory',
  'STRAIGHT_FLY': 'Straight Fly',
  'SPAM': 'Spam',
  'DUAL': 'Dual',
  'UFO': 'UFO',
  'BALL': 'Ball',
  'ROBOT': 'Robot',
  'SPIDER': 'Spider',
  'SWING': 'Swing',
  'PLATFORMER': 'Platformer'
};

const getYouTubeVideoId = (urlOrId) => {
  if (!urlOrId) return null;

  if (urlOrId.includes('youtube.com') || urlOrId.includes('youtu.be')) {
    const urlRegex = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([^?&\n]+)/;
    const urlMatch = urlOrId.match(urlRegex);
    if (urlMatch && urlMatch[1]) {
      return urlMatch[1].substring(0, 11);
    }
  }
  
  const ytIdRegex = /^[a-zA-Z0-9_-]{11}$/;
  if (ytIdRegex.test(urlOrId)) {
    return urlOrId;
  }
  
  return null; 
};

const difficultyColors = {
  EASY: 'bg-green-500/20 text-green-400 border-green-500/30',
  MEDIUM: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  HARD: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  INSANE: 'bg-red-500/20 text-red-400 border-red-500/30',
  EXTREME: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

export default function LayoutCard({ layout }) {
  const { t } = useLanguage();
  const videoId = getYouTubeVideoId(layout.videoUrl);
  const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/0.jpg` : null;

  return (
    <Link
      to={`/layouts/${layout.id}`}
      className="w-full flex gap-4 bg-ui-bg p-4 rounded-lg shadow-lg border border-primary-bg hover:border-accent hover:shadow-accent/20 transition-all duration-200"
    >
      <div className="w-40 flex-shrink-0 aspect-video rounded-md overflow-hidden bg-primary-bg">
        <img
          src={thumbnailUrl || 'https://placehold.co/320x180/1e293b/ffffff?text=No+Preview'}
          alt={`${layout.levelName} thumbnail`}
          className="w-full h-full object-cover"
          onError={(e) => { e.currentTarget.src = `https://placehold.co/320x180/1e293b/ffffff?text=${encodeURIComponent(t('no_preview'))}`; }}
        />
      </div>
      <div className="flex flex-col flex-grow min-w-0">
        <div className="flex justify-between items-start">
          <div className="min-w-0">
            <h3 className="font-bold text-xl text-text-on-ui truncate">{layout.levelName}</h3>
            <p className="text-sm text-text-muted flex items-center gap-1.5">
              <User size={14} />
              {layout.creator.username}
            </p>
          </div>
          <span className={`text-xs font-bold px-2 py-1 rounded-full border flex-shrink-0 ${difficultyColors[layout.difficulty]}`}>
            {layout.difficulty.replace('_', ' ')}
          </span>
        </div>
        <div className="border-t border-primary-bg my-2"></div>
        <div className="flex-grow">
          <p className="text-sm text-text-on-ui/90 line-clamp-2">{layout.description || t('no_description_provided')}</p>
        </div>
        {layout.tags && layout.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2 items-center">
            <Tag size={14} className="text-text-muted" />
            {/* [FIX] Use tagDisplayNames to show the formatted name */}
            {layout.tags.slice(0, 3).map(tagValue => (
              <span key={tagValue} className="text-xs text-text-muted bg-primary-bg px-2 py-0.5 rounded-full">
                {tagDisplayNames[tagValue] || tagValue}
              </span>
            ))}
            {layout.tags.length > 3 && <span className="text-xs text-text-muted/80">+{layout.tags.length - 3} {t('tags_more')}</span>}
          </div>
        )}
      </div>
    </Link>
  );
}