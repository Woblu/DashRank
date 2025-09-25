import React from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { Pencil, Trash2, Pin, PinOff } from 'lucide-react';
import YouTubeThumbnail from './YouTubeThumbnail'; // Import the new component

const getYouTubeVideoId = (urlOrId) => {
  if (!urlOrId) return null;
  const urlRegex = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([^?&\n]+)/;
  const urlMatch = urlOrId.match(urlRegex);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1].substring(0, 11);
  }
  if (typeof urlOrId === 'string' && urlOrId.length >= 11) {
     return urlOrId.substring(0, 11);
  }
  return null;
};

export default function LevelCard({ level, index, listType, onEdit, onDelete, onPin, pinnedRecordId }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const isPinned = level.id === pinnedRecordId;

  const videoUrl = level.videoUrl || level.videoId;
  const levelName = level.name || level.levelName;
  const videoId = getYouTubeVideoId(videoUrl);
  
  // Custom thumbnail from JSON/database is checked first
  const customThumbnail = level.thumbnail || level.thumbnailUrl;

  const handleClick = () => {
    let path;
    if (listType === 'progression') {
      path = `/progression/${level.id}`;
    } else {
      path = `/level/${listType}/${level.levelId || level.id}`;
    }
    
    if (level.id || level.levelId) {
      navigate(path);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`w-full rounded-xl shadow-md p-4 flex flex-col sm:flex-row items-center gap-3 cursor-pointer
        transition-transform transform hover:-translate-y-1 hover:shadow-xl hover:ring-2 hover:ring-cyan-400
        border-2 border-dotted border-cyan-400 bg-white dark:bg-gray-800`}
    >
      <div className="w-full sm:w-40 aspect-video rounded-md overflow-hidden flex-shrink-0 relative">
        {customThumbnail ? (
          <img
            src={customThumbnail}
            alt={`${levelName} thumbnail`}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/160x90/1e293b/ffffff?text=Invalid`; }}
          />
        ) : (
          <YouTubeThumbnail
            videoId={videoId}
            altText={`${levelName} thumbnail`}
            className="w-full h-full object-cover"
          />
        )}
        
        {isPinned && listType === 'progression' && (
          <div className="absolute top-1 right-1 bg-yellow-400 p-1 rounded-full"><Pin size={12} className="text-gray-900"/></div>
        )}
      </div>

      <div className="flex flex-col flex-grow text-center sm:text-left">
        <h2 className="font-bold text-xl text-cyan-700 dark:text-cyan-400">
          #{level.placement} - {levelName}
        </h2>
        
        <p className="text-gray-500 dark:text-gray-400">
            {listType === 'progression' ? `${level.difficulty?.replace('_', ' ')} Demon ${level.attempts ? `- ${level.attempts} attempts` : ''}` : `${t('by')} ${level.creator}`}
        </p>
      </div>

      {listType === 'progression' && (
        <div className="flex flex-col sm:flex-row gap-1">
          {/* ... buttons remain the same ... */}
        </div>
      )}
    </div>
  );
}