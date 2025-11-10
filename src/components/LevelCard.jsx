import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { Pencil, Trash2, Pin, PinOff } from 'lucide-react';

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
  
  let thumbnailUrl = level.thumbnail || level.thumbnailUrl;
  if (!thumbnailUrl && videoId) {
    thumbnailUrl = `https://img.youtube.com/vi/${videoId}/0.jpg`;
  }

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
  
  // --- (NEW) Logic for translatable progression text ---
  const getProgressionText = () => {
    const difficulty = level.difficulty?.replace('_', ' ');
    if (level.attempts) {
      return t('progression_demon_attempts', { difficulty: difficulty, attempts: level.attempts });
    }
    return t('progression_demon', { difficulty: difficulty });
  };

  return (
    <div
      onClick={handleClick}
      className={`w-full rounded-xl shadow-md p-4 flex flex-col sm:flex-row items-center gap-3 cursor-pointer
        transition-transform transform hover:-translate-y-1 hover:shadow-xl hover:ring-2 hover:ring-accent
        border-2 border-dotted border-accent bg-ui-bg`} /* THEMED */
    >
      <div className="w-full sm:w-40 aspect-video rounded-md overflow-hidden flex-shrink-0 relative">
        <img
          src={thumbnailUrl || 'https://placehold.co/320x180/1e293b/ffffff?text=No+Thumb'}
          alt={`${levelName} thumbnail`}
          className="w-full h-full object-cover"
        />
        {isPinned && listType === 'progression' && (
          <div className="absolute top-1 right-1 bg-yellow-400 p-1 rounded-full"><Pin size={12} className="text-gray-900"/></div>
        )}
      </div>

      <div className="flex flex-col flex-grow text-center sm:text-left">
        <h2 className="font-bold text-xl text-accent"> {/* THEMED */}
          #{level.placement} - {levelName}
        </h2>
        
        <p className="text-text-muted"> {/* THEMED */}
            {listType === 'progression' ? getProgressionText() : `${t('by')} ${level.creator}`}
        </p>
      </div>

      {listType === 'progression' && (
        <div className="flex flex-col sm:flex-row gap-1 z-10">
          {onPin && (
            <button 
              type="button" 
              onClick={(e) => { e.stopPropagation(); onPin(isPinned ? null : level.id); }} 
              className={`p-2 rounded-full ${isPinned ? 'text-yellow-400 bg-yellow-500/20' : 'text-text-muted hover:bg-primary-bg'}`} /* THEMED */
              title={isPinned ? "Unpin Record" : "Pin Record"}
            >
              {isPinned ? <PinOff className="w-5 h-5" /> : <Pin className="w-5 h-5" />}
            </button>
          )}
          {onEdit && (
            <button 
              type="button" 
              onClick={(e) => { e.stopPropagation(); onEdit(level); }} 
              className="p-2 text-text-muted hover:bg-primary-bg rounded-full" /* THEMED */
              title="Edit Record"
            >
              <Pencil className="w-5 h-5" />
            </button>
          )}
          {onDelete && (
            <button 
              type="button" 
              onClick={(e) => { e.stopPropagation(); onDelete(level.id); }} 
              className="p-2 text-red-500 hover:bg-red-500/20 rounded-full"
              title="Delete Record"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}