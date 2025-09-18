// src/pages/LevelDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { ChevronLeft, Trash2 } from 'lucide-react'; // Import Trash2 icon
import { useAuth } from '../contexts/AuthContext.jsx';    // Import auth hook
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
    fetchLevel();
  }, [levelId, listType]);

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
      {/* ... Level Info Section (no changes here) ... */}

      <div className="bg-gray-800 p-6 rounded-lg shadow-inner">
        <h2 className="text-2xl font-bold text-center text-cyan-400 mb-4">{t('records')}</h2>
        
        <ul className="space-y-2 text-lg">
          {/* Verifier Record */}
          <li className="flex items-center justify-center p-2">
            <button onClick={() => handleRecordClick(level.videoId)} className="text-cyan-400 hover:underline">
              <span className="font-bold">{level.verifier}</span>
              <span className="font-mono text-sm text-gray-400 ml-2">(Verifier)</span>
            </button>
          </li>

          {/* Player Records */}
          {level.records && level.records.map((record, index) => (
            <li key={record.videoId || index} className="flex items-center justify-between bg-gray-900/50 p-3 rounded-lg">
              <div className="flex-1 text-center">
                <button onClick={() => handleRecordClick(record.videoId)} className="text-cyan-400 hover:underline">
                  {record.username}
                  <span className="font-mono text-sm text-gray-400 ml-2">({record.percent}%)</span>
                </button>
              </div>

              {/* Conditional Remove Button for Admins */}
              {user && (user.role === 'ADMIN' || user.role === 'MODERATOR') && (
                <button
                  onClick={() => handleRemoveRecord(record.videoId)}
                  className="p-2 text-red-500 hover:bg-red-500/20 rounded-full transition-colors"
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