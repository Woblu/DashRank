import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { ChevronLeft, Copy, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner';

const getYouTubeVideoId = (urlOrId) => {
  if (!urlOrId) return null;
  const urlRegex = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([^?&\n]+)/;
  const urlMatch = urlOrId.match(urlRegex);
  if (urlMatch && urlMatch[1]) { return urlMatch[1]; }
  return urlOrId.split('?')[0].split('&')[0];
};

export default function LevelDetail() {
  const { listType, levelId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, token } = useAuth();
  
  const [level, setLevel] = useState(null);
  const [history, setHistory] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isCopied, setIsCopied] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState(null);

  const fetchLevelAndHistory = async () => {
    setIsLoading(true);
    setError(null);
    setHistory([]);
    try {
      const dbListName = `${listType}-list`;
      const listResponse = await axios.get(`/api/lists/${dbListName}`);
      const foundLevel = listResponse.data.find(l => l.levelId === parseInt(levelId));

      if (foundLevel) {
        setLevel(foundLevel);
        if (foundLevel.videoId) {
          setCurrentVideoId(getYouTubeVideoId(foundLevel.videoId));
        }
        const historyResponse = await axios.get(`/api/levels/${foundLevel.id}/history`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setHistory(historyResponse.data);
      } else {
        throw new Error("Level not found on this list.");
      }
    } catch (err) {
      console.error("Failed to fetch level details or history:", err);
      setError("Failed to load level data. It might not exist on this list.");
      setLevel(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchLevelAndHistory();
  }, [levelId, listType, token]);

  const handleCopyClick = () => {
    if (level?.levelId) {
      navigator.clipboard.writeText(level.levelId).then(() => {
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
    if (!window.confirm('Are you sure you want to permanently remove this record?')) return;
    try {
      await axios.post('/api/admin/remove-record', 
        { levelId: level.id, recordVideoId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchLevelAndHistory();
    } catch (err)
 {
      alert(`Failed to remove record: ${err.response?.data?.message || 'Server error'}`);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading Level Details..." />;
  }

  if (error || !level) {
    return (
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold text-red-500">{error || "Level Not Found"}</h1>
        <button onClick={() => navigate(`/${listType}`)} className="mt-4 inline-flex items-center text-cyan-600 dark:text-cyan-400 hover:underline">
          <ChevronLeft size={16} /> Go Back to List
        </button>
      </div>
    );
  }
  
  const verifierLabel = level.list === 'future-list' ? 'Verification Status:' : 'Verified by:';
  
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 text-gray-900 dark:text-gray-100">
      <div className="relative bg-gray-100 dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-lg mb-6">
        <button 
          onClick={() => navigate(-1)} 
          className="absolute top-4 left-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100 hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
          aria-label="Go back"
        >
          <ChevronLeft size={24} />
        </button>

        <div className="text-center mb-4 pt-8 sm:pt-0">
          <h1 className="font-poppins text-5xl font-bold text-cyan-600 dark:text-cyan-400 break-words">
            #{level.placement} - {level.name}
          </h1>
        </div>

        <div className="flex flex-wrap justify-center text-center mb-4 gap-x-8 gap-y-2">
          <p className="text-lg text-gray-700 dark:text-gray-300">
            <span className="font-bold">Published by:</span> {level.creator}
          </p>
          <p className="text-lg text-gray-700 dark:text-gray-300">
            <span className="font-bold">{verifierLabel}</span> {level.verifier}
          </p>
        </div>
        
        {level.levelId && (
          <div className="text-center mb-6">
            <p className="text-lg text-gray-700 dark:text-gray-300">
              <span className="font-bold">Level ID:</span>
              <button
                onClick={handleCopyClick}
                className="ml-2 px-2 py-1 rounded-md font-mono bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                {isCopied ? t('copied') : level.levelId}
              </button>
            </p>
          </div>
        )}

        {currentVideoId && (
          <div className="aspect-video w-full">
            <iframe
              key={currentVideoId}
              width="100%"
              height="100%"
              src={`https://www.youtube-nocookie.com/embed/${currentVideoId}`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="rounded-xl shadow-lg"
            ></iframe>
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-inner">
          <button 
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className="w-full flex justify-between items-center p-4 text-xl font-bold text-cyan-600 dark:text-cyan-400"
          >
            <span>Position History</span>
            {isHistoryOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
          </button>
          {isHistoryOpen && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <ul className="space-y-2">
                {history.map(change => (
                  <li key={change.id} className="text-gray-700 dark:text-gray-300 flex justify-between items-center">
                    <span>{change.description}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(change.createdAt).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg shadow-inner">
        <h2 className="text-2xl font-bold text-center text-cyan-600 dark:text-cyan-400 mb-4">{t('records')}</h2>
        
        <ul className="text-center space-y-2 text-lg">
          <li>
            <button onClick={() => handleRecordClick(level.videoId)} className="text-cyan-600 dark:text-cyan-400 hover:underline">
              <span className="font-bold">{level.verifier}</span>
              <span className="font-mono text-sm text-gray-500 dark:text-gray-400 ml-2">(Verifier)</span>
            </button>
          </li>

          {level.records && level.records.map((record, index) => (
            record.videoId && (
              <li key={index} className="flex items-center justify-center gap-2">
                <button onClick={() => handleRecordClick(record.videoId)} className="text-cyan-600 dark:text-cyan-400 hover:underline">
                  {record.username}
                  <span className="font-mono text-sm text-gray-500 dark:text-gray-400 ml-2">({record.percent}%)</span>
                </button>
                {user && (user.role === 'ADMIN' || user.role === 'MODERATOR') && (
                  <button
                    onClick={() => handleRemoveRecord(record.videoId)}
                    className="p-1 text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                    title="Remove Record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </li>
            )
          ))}
        </ul>
        
        {(!level.records || level.records.length === 0) && (
          <p className="text-center text-gray-600 dark:text-gray-400 mt-4">{t('no_records_yet')}</p>
        )}
      </div>
    </div>
  );
}