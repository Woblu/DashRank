import React from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext.jsx";

const getYouTubeVideoId = (urlOrId) => {
  if (!urlOrId) return null;
  const urlRegex = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([^?&\n]+)/;
  const urlMatch = urlOrId.match(urlRegex);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }
  return urlOrId.split('?')[0].split('&')[0];
};

export default function LevelCard({ level, index, listType }) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleClick = () => {
    // THIS IS THE FIX: Always use level.levelId
    const identifier = level.levelId;
    if (identifier) {
      navigate(`/level/${listType}/${identifier}`);
    }
  };

  let thumbnailUrl;
  const videoId = getYouTubeVideoId(level.videoId);

  if (level.thumbnail && level.thumbnail.startsWith('http')) {
    thumbnailUrl = level.thumbnail;
  } else if (videoId) {
    thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  } else {
    thumbnailUrl = `https://placehold.co/160x90/cccccc/ffffff?text=GD`;
  }

  return (
    <div
      onClick={handleClick}
      className={`w-full rounded-xl shadow-md p-4 flex flex-col sm:flex-row items-center gap-3 cursor-pointer
        transition-transform transform hover:-translate-y-1 hover:shadow-xl hover:ring-2 hover:ring-cyan-400
        border-2 border-dotted border-cyan-400 bg-white dark:bg-gray-800`}
    >
      <div className="w-full sm:w-40 aspect-video rounded-md overflow-hidden flex-shrink-0">
        <img
          src={thumbnailUrl}
          alt={`${level.name} thumbnail`}
          className="w-full h-full object-cover"
          onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/160x90/cccccc/ffffff?text=GD`; }}
        />
      </div>

      <div className="flex flex-col flex-grow text-center sm:text-left">
        <h2 className="font-bold text-xl text-cyan-700 dark:text-cyan-400">
          #{level.placement} - {level.name}
        </h2>
        
        <p className="text-gray-500 dark:text-gray-400">
          {t('published_by')} {level.creator}
        </p>
      </div>
    </div>
  );
}