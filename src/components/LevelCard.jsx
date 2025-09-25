import React from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { Pencil, Trash2, Pin, PinOff } from 'lucide-react';

const getYouTubeVideoId = (urlOrId) => {
  if (!urlOrId) return null;
  const urlRegex = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([^?&\n]+)/;
  const urlMatch = urlOrId.match(urlRegex);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }
  // This part is a fallback for cases where only the ID is provided
  if (typeof urlOrId === 'string' && urlOrId.length === 11 && !urlOrId.includes('/')) {
    return urlOrId;
  }
  return null; // Return null if it's not a valid YouTube URL or ID
};

export default function LevelCard({ level, index, listType, onEdit, onDelete, onPin, pinnedRecordId }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const isPinned = level.id === pinnedRecordId;

  const videoUrl = level.videoUrl || level.videoId;
  const levelName = level.name || level.levelName;
  const videoId = getYouTubeVideoId(videoUrl);
  
  // This logic is now more robust
  let thumbnailUrl = level.thumbnail || level.thumbnailUrl;
  if (!thumbnailUrl && videoId) {
    thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
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

  return (
    <div
      onClick={handleClick}
      className={`w-full rounded-xl shadow-md p-4 flex flex-col sm:flex-row items-center gap-3 cursor-pointer
        transition-transform transform hover:-translate-y-1 hover:shadow-xl hover:ring-2 hover:ring-cyan-400
        border-2 border-dotted border-cyan-400 bg-white dark:bg-gray-800`}
    >
      <div className="w-full sm:w-40 aspect-video rounded-md overflow-hidden flex-shrink-0 relative">
        <img
          src={thumbnailUrl || 'https://placehold.co/160x90/1e293b/ffffff?text=No+Thumb'}
          alt={`${levelName} thumbnail`}
          className="w-full h-full object-cover"
          onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/160x90/1e293b/ffffff?text=Invalid`; }}
        />
        {/* FIX: This icon now only shows on the progression list */}
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
          {onPin && (
            <button 
              type="button" 
              onClick={(e) => { e.stopPropagation(); onPin(isPinned ? null : level.id); }} 
              className={`p-2 rounded-full ${isPinned ? 'text-yellow-400 bg-yellow-500/20' : 'text-gray-300 hover:bg-gray-700'}`}
              title={isPinned ? "Unpin Record" : "Pin Record"}
            >
              {isPinned ? <PinOff className="w-5 h-5" /> : <Pin className="w-5 h-5" />}
            </button>
          )}
          {onEdit && (
            <button 
              type="button" 
              onClick={(e) => { e.stopPropagation(); onEdit(level); }} 
              className="p-2 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
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