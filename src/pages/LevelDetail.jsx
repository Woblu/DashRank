// src/pages/LevelDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { ChevronLeft, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner';
import { getYoutubeEmbed } from '../utils/embedUtils.js'; // Using the renamed util

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
  const [embedInfo, setEmbedInfo] = useState(null);

  const fetchLevelAndHistory = async () => {
    setIsLoading(true);
    setError(null);
    setHistory([]);
    setEmbedInfo(null);
    try {
      // Construct the correct API URL using levelId
      const apiUrl = `/api/level/${levelId}?list=${listType}-list`;
      const levelResponse = await axios.get(apiUrl);
      setLevel(levelResponse.data);

      if (levelResponse.data?.videoId) {
        const embedResult = getYoutubeEmbed(levelResponse.data.videoId);
        setEmbedInfo(embedResult);
      }

      if (token && levelResponse.data?.id) {
        const historyResponse = await axios.get(`/api/levels/${levelResponse.data.id}/history`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setHistory(historyResponse.data);
      }
    } catch (err) {
      console.error("Failed to fetch level details:", err);
      // More specific error based on response if available
      const errMsg = err.response?.status === 404
        ? `Level with ID ${levelId} not found on the ${listType} list.`
        : "Failed to load level data.";
      setError(errMsg);
      setLevel(null);
    } finally {
      setIsLoading(false);
    }
  };


  useEffect(() => {
    window.scrollTo(0, 0);
    // Ensure levelId is valid before fetching
    if (levelId) {
       fetchLevelAndHistory();
    } else {
        setError("Invalid level ID.");
        setIsLoading(false);
    }
  }, [levelId, listType, token]); // Dependencies remain the same


  const handleCopyClick = () => {
    if (level?.levelId) {
      navigator.clipboard.writeText(level.levelId).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      });
    }
  };

  const handleRecordClick = (videoId) => {
    const embedResult = getYoutubeEmbed(videoId);
    setEmbedInfo(embedResult);
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
    } catch (err) {
      alert(`Failed to remove record: ${err.response?.data?.message || 'Server error'}`);
    }
  };

  if (isLoading) return <LoadingSpinner message="Loading Level Details..." />;

  if (error || !level) {
    return (
      <div className="text-center p-8">
        {/* Adjusted error text color */}
        <h1 className="text-2xl font-bold text-red-600 dark:text-red-500">{error || "Level Not Found"}</h1>
        {/* Adjusted back button text color */}
        <button onClick={() => navigate(`/`)} className="mt-4 inline-flex items-center text-cyan-600 dark:text-cyan-400 hover:underline">
          <ChevronLeft size={16} /> Go Back to List
        </button>
      </div>
    );
  }

  const verifierLabel = level.list === 'future-list' ? 'Verification Status:' : 'Verified by:';
  const recordVerifierLabel = level.list === 'future-list' ? '(Status)' : '(Verifier)';

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Main Level Box: Keep dotted cyan border, update background */}
      <div className="relative bg-white dark:bg-gray-800 border-2 border-dotted border-cyan-400 backdrop-blur-sm p-4 sm:p-6 rounded-xl shadow-2xl">
        {/* Back Button: Updated styles */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 hover:scale-110 transition-all"
          aria-label="Go back"
        >
          <ChevronLeft size={24} />
        </button>

        <div className="text-center mb-4 pt-8 sm:pt-0">
          {/* Title: Updated text color */}
          <h1 className="font-poppins text-5xl font-bold break-words text-cyan-600 dark:text-cyan-400">
            #{level.placement} - {level.name}
          </h1>
        </div>

        {/* Details Text: Updated text color */}
        <div className="flex flex-wrap justify-center text-center mb-4 gap-x-8 gap-y-2 text-lg text-gray-600 dark:text-gray-300">
          <p><span className="font-bold text-gray-800 dark:text-white">Published by:</span> {level.creator}</p>
          <p><span className="font-bold text-gray-800 dark:text-white">{verifierLabel}</span> {level.verifier}</p>
          {level.attempts && (
            <p><span className="font-bold text-gray-800 dark:text-white">Attempts:</span> {level.attempts.toLocaleString()}</p>
          )}
        </div>

        {level.levelId && (
          <div className="text-center mb-6">
             {/* Level ID Text: Updated text color */}
            <p className="text-lg text-gray-600 dark:text-gray-300">
              <span className="font-bold text-gray-800 dark:text-white">Level ID:</span>
              {/* Copy Button: Updated styles */}
              <button
                onClick={handleCopyClick}
                className="ml-2 px-3 py-1 rounded-md font-mono bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-300"
              >
                {isCopied ? t('copied') : level.levelId}
              </button>
            </p>
          </div>
        )}

        {/* Video Embed */}
        {embedInfo && embedInfo.url ? (
           // Video Container: Updated border style
          <div className="aspect-video w-full border-2 border-gray-300 dark:border-gray-600 rounded-xl overflow-hidden bg-black">
            {embedInfo.type === 'iframe' ? (
              <iframe
                key={embedInfo.url}
                width="100%"
                height="100%"
                src={embedInfo.url}
                title="Video Player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            ) : (
              <video
                key={embedInfo.url}
                width="100%"
                height="100%"
                src={embedInfo.url}
                controls
              ></video>
            )}
          </div>
        ) : (
           // Placeholder: Keep dashed border, update text color
          <div className="aspect-video w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex items-center justify-center bg-gray-50 dark:bg-gray-700/30">
            <p className="text-gray-500 dark:text-gray-400">No embeddable video found for this level.</p>
          </div>
        )}
      </div>

       {/* Position History Box: Remove dotted border, update styles */}
       {history.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 backdrop-blur-sm rounded-lg shadow-inner">
          <button
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
             // Button style consistency (assuming this hover is desired)
            className="w-full flex justify-between items-center p-4 text-xl font-bold text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <span>Position History</span>
            {isHistoryOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
          </button>
          {isHistoryOpen && (
            // Inner border remains subtle accent
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <ul className="space-y-2">
                {history.map(change => (
                  <li key={change.id} className="text-gray-700 dark:text-gray-300 flex justify-between items-center text-sm">
                    <span>{change.description}</span>
                    <span className="text-gray-500 dark:text-gray-400">{new Date(change.createdAt).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Records Box: Remove dotted border, update styles */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 backdrop-blur-sm p-6 rounded-lg shadow-inner">
         {/* Title: Updated text color */}
        <h2 className="text-3xl font-bold text-center mb-4 text-cyan-600 dark:text-cyan-400">{t('records')}</h2>

        <ul className="text-center space-y-2 text-lg">
          <li>
             {/* Record Button: Updated styles */}
            <button onClick={() => handleRecordClick(level.videoId)} className="text-gray-800 dark:text-gray-200 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
              <span className="font-bold">{level.verifier}</span>
               {/* Verifier Label: Updated styles */}
              <span className="font-mono text-sm text-gray-500 dark:text-gray-400 ml-2">{recordVerifierLabel}</span>
            </button>
          </li>

          {level.records?.map((record, index) => (
            record.videoId && (
              <li key={index} className="flex items-center justify-center gap-2 group text-gray-800 dark:text-gray-200">
                 {/* Record Button: Updated styles */}
                <button onClick={() => handleRecordClick(record.videoId)} className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
                  {record.username}
                   {/* Percentage Label: Updated styles */}
                  <span className="font-mono text-sm text-gray-500 dark:text-gray-400 ml-2">({record.percent}%)</span>
                </button>
                {user && (user.role === 'ADMIN' || user.role === 'MODERATOR') && (
                  <button
                    onClick={() => handleRemoveRecord(record.videoId)}
                    className="p-1 text-red-500 hover:bg-red-500/10 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove Record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </li>
            )
          ))}
        </ul>

        {/* No Records Text: Updated styles */}
        {!level.records?.length && (
          <p className="text-center text-gray-500 dark:text-gray-400 mt-4">{t('no_records_yet')}</p>
        )}
      </div>
    </div>
  );
}