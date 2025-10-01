import React from 'react';
import { Link } from 'react-router-dom';
import { Tag, User } from 'lucide-react';

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

const difficultyColors = {
  EASY: 'bg-green-500/20 text-green-400 border-green-500/30',
  MEDIUM: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  HARD: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  INSANE: 'bg-red-500/20 text-red-400 border-red-500/30',
  EXTREME: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

export default function LayoutCard({ layout }) {
  const videoId = getYouTubeVideoId(layout.videoUrl);
  const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/0.jpg` : 'https://placehold.co/320x180/1e293b/ffffff?text=No+Preview';

  return (
    <Link to={`/layouts/${layout.id}`} className="block bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 transition-all hover:border-cyan-400/50 hover:bg-gray-800/80">
      <div className="flex flex-col sm:flex-row gap-4 h-full">
        <div className="w-full sm:w-48 aspect-video rounded-md overflow-hidden flex-shrink-0">
          <img
            src={thumbnailUrl}
            alt={`${layout.levelName} thumbnail`}
            className="w-full h-full object-cover"
          />
        </div>
        {/* Added `min-w-0` to this container to prevent cropping */}
        <div className="flex flex-col flex-grow min-w-0">
          <div className="flex justify-between items-start">
            <div className="min-w-0">
              <h3 className="font-bold text-xl text-white truncate">{layout.levelName}</h3>
              <p className="text-sm text-gray-400 flex items-center gap-1.5">
                <User size={14} />
                {layout.creator.username}
              </p>
            </div>
            <span className={`text-xs font-bold px-2 py-1 rounded-full border flex-shrink-0 ${difficultyColors[layout.difficulty]}`}>
              {layout.difficulty.replace('_', ' ')}
            </span>
          </div>
          <div className="border-t border-gray-700 my-2"></div>
          <div className="flex-grow">
            <p className="text-sm text-gray-300 line-clamp-2">{layout.description || "No description provided."}</p>
          </div>
          {layout.tags && layout.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2 items-center">
              <Tag size={14} className="text-gray-400" />
              {layout.tags.slice(0, 3).map(tag => (
                <span key={tag} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-md">{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}