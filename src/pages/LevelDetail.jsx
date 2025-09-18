// src/pages/LevelDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { ChevronLeft, Copy, Trash2 } from 'lucide-react'; // Import Trash2 icon
import { useAuth } from '../contexts/AuthContext.jsx';    // Import auth hook
import axios from 'axios';

const getYouTubeVideoId = (urlOrId) => {
  if (!urlOrId) return null;
  const urlRegex = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([^?&\n]+)/;
  const urlMatch = urlOrId.match(urlRegex);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }
  // Fallback for simple IDs
  return urlOrId.split('?')[0].split('&')[0];
};

export default function LevelDetail() {
  const { listType, levelId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, token } = useAuth(); // Get user and token for admin checks
  
  const [level, setLevel] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isCopied, setIsCopied] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState(null);

  const fetchLevel = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // The API endpoint for a single level might just need the level's own ID, not the listType
      const response = await axios.get(`/api/level/${levelId}`);
      setLevel(response.data);
      if (!currentVideoId) { // Set initial video only once
        setCurrentVideoId(getYouTubeVideoId(response.data.videoId));
      }
    } catch (err) {
      console.error("Failed to fetch level details:", err);
      setError("Failed to load level data. It might not exist.");
      setLevel(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    // Reset current video when levelId changes
    setCurrentVideoId(null);
    fetchLevel();
  }, [levelId]);

  const handleCopyClick = () => {
    if (level?.levelId) {
      navigator.clipboard.writeText(level.levelId.toString()).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      });
    }
  };
  
  const handleRecordClick = (videoId) => {
    setCurrentVideoId(getYouTubeVideoId(videoId));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRemoveRecord = async (recordVideoId) => {
    if (!window.confirm('Are you sure you want to permanently remove this record?')) {
      return;
    }
    try {
      await axios.post('/api/admin/remove-record', 
        { levelId: level.id, recordVideoId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchLevel(); // Refresh data after deletion
    } catch (err) {
      alert(`Failed to remove record: ${err.response?.data?.message || 'Server error'}`);
    }
  };

  if (isLoading) {
    return <div className="text-center p-8 text-gray-200">{t('loading_data')}</div>;
  }

  if (error || !level) {
    return (
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold text-red-500">{error || "Level Not Found"}</h1>
        <button onClick={() => navigate(-1)} className="mt-4 inline-flex items-center text-cyan-400 hover:underline">
          <ChevronLeft size={16} /> Go Back
        </button>
      </div>
    );
  }

  const verifierLabel = level.list === 'future' ? 'Verification Status:' : 'Verified by:';

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 text-gray-100">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column for video */}
        <div className="md:col-span-2">
          <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
            {currentVideoId ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${currentVideoId}`}
                title="Geometry Dash Level"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute top-0 left-0 w-full h-full rounded-lg shadow-lg"
              ></iframe>
            ) : (
              <div className="absolute top-0 left-0 w-full h-full rounded-lg shadow-lg bg-gray-900 flex items-center justify-center">
                <p>No video available.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right column for records */}
        <div className="bg-gray-800 p-4 rounded-lg shadow-inner">
          <h2 className="text-xl font-bold text-center text-cyan-400 mb-4">{t('records')}</h2>
          <ul className="space-y-2 text-lg max-h-[50vh] overflow-y-auto custom-scrollbar">
            {/* Verifier Record */}
            <li>
              <button
                onClick={() => handleRecordClick(level.videoId)}
                className={`w-full text-left p-2 rounded transition-colors ${
                  getYouTubeVideoId(level.videoId) === currentVideoId
                    ? 'bg-cyan-500/20'
                    : 'hover:bg-gray-700'
                }`}
              >
                {level.verifier}
                <span className="font-mono text-sm text-gray-400 ml-2">(Verifier)</span>
              </button>
            </li>
            {/* Player Records */}
            {level.records && level.records.map((record, index) => (
              <li key={record.videoId || index} className="flex items-center justify-between hover:bg-gray-700/50 rounded-lg pr-2">
                <button
                  onClick={() => handleRecordClick(record.videoId)}
                  className={`flex-1 text-left p-2 rounded transition-colors ${
                    getYouTubeVideoId(record.videoId) === currentVideoId
                      ? 'bg-cyan-500/20'
                      : '' // No hover effect needed here, parent li handles it
                  }`}
                >
                  {record.username}
                  <span className="font-mono text-sm text-gray-400 ml-2">({record.percent}%)</span>
                </button>

                {/* Conditional Remove Button for Admins */}
                {user && (user.role === 'ADMIN' || user.role === 'MODERATOR') && (
                  <button
                    onClick={() => handleRemoveRecord(record.videoId)}
                    className="p-2 ml-2 text-red-500 hover:bg-red-500/20 rounded-full transition-colors"
                    title="Remove Record"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Level details below video */}
      <div className="mt-6 bg-gray-800 p-6 rounded-lg shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h1 className="text-4xl font-bold">{level.name}</h1>
            <p className="text-lg text-gray-400">
              by <span className="font-semibold text-cyan-400">{level.creator}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 mt-4 sm:mt-0">
            <span className="font-mono text-sm text-gray-400">ID: {level.levelId}</span>
            <button
              onClick={handleCopyClick}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-md"
              title="Copy ID"
            >
              <Copy size={16} />
            </button>
            {isCopied && <span className="text-xs text-green-400">Copied!</span>}
          </div>
        </div>
        <p className="mt-4 text-md">
          <span className="font-semibold">{verifierLabel}</span> {level.verifier}
        </p>
        {level.description && (
          <p className="mt-4 text-gray-300 whitespace-pre-wrap">{level.description}</p>
        )}
      </div>
    </div>
  );
}