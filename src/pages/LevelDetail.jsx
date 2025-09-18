// src/pages/LevelDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { ChevronLeft, Copy, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import axios from 'axios';

const getYouTubeVideoId = (urlOrId) => {
  if (!urlOrId) return null;
  const urlRegex = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([^?&\n]+)/;
  const urlMatch = urlOrId.match(urlRegex);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }
  return urlOrId.split('?')[0].split('&')[0];
};

export default function LevelDetail() {
  const { listType, levelId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, token } = useAuth();
  
  const [level, setLevel] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isCopied, setIsCopied] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState(null);

  const fetchLevel = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/api/level/${levelId}`);
      setLevel(response.data);
      if (response.data.videoId) {
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
      fetchLevel();
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
        <button onClick={() => navigate(`/${listType}`)} className="mt-4 inline-flex items-center text-cyan-400 hover:underline">
          <ChevronLeft size={16} /> Go Back to List
        </button>
      </div>
    );
  }

  const verifierLabel = level.list === 'future' ? 'Verification Status:' : 'Verified by:';

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 text-gray-100">
      <div className="mb-6">
        <h1 className="text-4xl font-bold">{level.name}</h1>
        <p className="text-lg text-gray-400">
          by <span className="font-semibold text-cyan-400">{level.creator}</span>
        </p>
      </div>

      <div className="aspect-w-16 aspect-h-9 mb-6">
        {currentVideoId ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${currentVideoId}`}
            title="Geometry Dash Level"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full rounded-lg shadow-lg"
          ></iframe>
        ) : (
          <div className="w-full h-full rounded-lg shadow-lg bg-gray-900 flex items-center justify-center">
            <p>No video available.</p>
          </div>
        )}
      </div>

      <div className="bg-gray-800 p-6 rounded-lg shadow-inner">
        <div className="flex justify-between items-center mb-4">
          <p className="text-md">
            <span className="font-semibold">{verifierLabel}</span> {level.verifier}
          </p>
          <div className="flex items-center gap-2">
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

        <h2 className="text-2xl font-bold text-cyan-400 mb-2 border-t border-gray-700 pt-4">{t('records')}</h2>
        <ul className="space-y-1">
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
                    : ''
                }`}
              >
                {record.username}
                <span className="font-mono text-sm text-gray-400 ml-2">({record.percent}%)</span>
              </button>
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
        {(!level.records || level.records.length === 0) && (
          <p className="text-center text-gray-400 mt-4">{t('no_records_yet')}</p>
        )}
      </div>
    </div>
  );
}