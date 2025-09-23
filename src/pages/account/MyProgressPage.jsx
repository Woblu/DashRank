// src/pages/account/MyProgressPage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { PlusCircle, Trash2, Film, Link as LinkIcon } from 'lucide-react';

// + Helper function to extract YouTube video ID from various URL formats
const getYouTubeId = (url) => {
  if (!url) return null;
  const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

export default function MyProgressPage() {
  // ... (all existing state and functions remain the same) ...

  // Find this section in your return statement and apply the changes
  return (
    <div className="space-y-8">
      {/* ... The 'Add New Completion' form ... */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg">
        <header className="p-4 border-b border-gray-700"><h2 className="text-2xl font-bold">My Completed Demons</h2></header>
        <div className="p-6 space-y-3">
          {loading ? <p className="text-center text-gray-400">Loading records...</p> : records.length > 0 ? records.map(record => {
            // + Logic to determine the correct thumbnail URL
            const youTubeId = getYouTubeId(record.videoUrl);
            const recordThumbnail = record.thumbnailUrl || (youTubeId ? `https://img.youtube.com/vi/${youTubeId}/mqdefault.jpg` : null);
            
            return (
              // + Changed layout to use flexbox and gap
              <div key={record.id} className="flex items-center bg-gray-900 p-3 rounded-lg gap-4">
                
                {/* + Display the thumbnail image */}
                {recordThumbnail && (
                  <a href={record.videoUrl} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                    <img 
                      src={recordThumbnail} 
                      alt={`${record.levelName} thumbnail`}
                      className="w-32 h-20 object-cover rounded hover:opacity-80 transition-opacity"
                      // + Hide the image if the link is broken, preventing ugly icons
                      onError={(e) => { e.target.parentElement.style.display = 'none'; }}
                    />
                  </a>
                )}

                <div className="flex-grow">
                  <p className="font-bold text-lg text-cyan-400">#{record.placement} - {record.levelName}</p>
                  <p className="text-sm text-gray-400">{record.difficulty.replace('_', ' ')} Demon {record.attempts ? `- ${record.attempts} attempts` : ''}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs">
                    <a href={record.videoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-gray-300 hover:text-cyan-400 transition-colors"><Film className="w-4 h-4" /> Video Proof</a>
                    {record.rawFootageLink && (<a href={record.rawFootageLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-gray-300 hover:text-cyan-400 transition-colors"><LinkIcon className="w-4 h-4" /> Raw Footage</a>)}
                  </div>
                </div>
                {/* + Added self-start to align button to the top */}
                <button onClick={() => handleDelete(record.id)} className="p-2 ml-2 text-red-500 hover:bg-red-500/20 rounded-full transition-colors self-start"><Trash2 className="w-5 h-5" /></button>
              </div>
            );
          }) : <p className="text-gray-400 text-center">You haven't added any personal records yet.</p>}
        </div>
      </div>
    </div>
  );
}