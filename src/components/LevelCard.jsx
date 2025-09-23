import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { Pencil, Trash2 } from 'lucide-react';

const getYouTubeId = (url) => {
    if (!url) return null;
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
};

export default function LevelCard({ level, index, listType, onEdit, onDelete }) {
  const { t } = useLanguage();
  const youTubeId = getYouTubeId(level.videoId);
  const thumbnailUrl = level.thumbnail || (youTubeId ? `https://img.youtube.com/vi/${youTubeId}/mqdefault.jpg` : null);
  const placement = level.placement || index + 1;

  // Render a different card structure for the progression tracker
  if (listType === 'progression') {
    return (
      <div className="flex items-center bg-gray-900 p-3 rounded-lg gap-4">
        <Link to={`/progression/${level.id}`} className="flex items-center gap-4 flex-grow hover:bg-gray-800/50 rounded-lg -m-3 p-3 transition-colors">
          {thumbnailUrl && (
            <div className="flex-shrink-0">
              <img 
                src={thumbnailUrl} 
                alt={`${level.name} thumbnail`}
                className="w-32 h-20 object-cover rounded"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          )}
          <div className="flex-grow">
            <p className="font-bold text-lg text-cyan-400">#{placement} - {level.name}</p>
            <p className="text-sm text-gray-400">{level.difficulty?.replace('_', ' ')} Demon {level.attempts ? `- ${level.attempts} attempts` : ''}</p>
          </div>
        </Link>
        <div className="flex flex-col sm:flex-row gap-1 z-10">
          <button 
            type="button" 
            onClick={() => onEdit(level)} 
            className="p-2 text-gray-300 hover:bg-gray-700 rounded-full"
            aria-label="Edit Record"
          >
            <Pencil className="w-5 h-5" />
          </button>
          <button 
            type="button" 
            onClick={() => onDelete(level.id)} 
            className="p-2 text-red-500 hover:bg-red-500/20 rounded-full"
            aria-label="Delete Record"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // Default card structure for all other lists
  return (
    <Link 
      to={`/level/${listType}/${level.id || placement}`} 
      className="flex items-center gap-4 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300"
    >
      <p className="text-xl font-bold w-12 text-center text-cyan-600 dark:text-cyan-400">#{placement}</p>
      {thumbnailUrl && (
        <div className="flex-shrink-0">
          <img src={thumbnailUrl} alt={level.name} className="w-32 h-20 object-cover rounded"/>
        </div>
      )}
      <div className="flex-grow">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{level.name}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">{t('by')} {level.creator}</p>
      </div>
      <div className="hidden sm:block text-right">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Verifier</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">{level.verifier}</p>
      </div>
    </Link>
  );
}