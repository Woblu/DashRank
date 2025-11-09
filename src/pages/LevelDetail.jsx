// src/pages/LevelDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { ChevronLeft, Trash2, ChevronDown, ChevronUp, Plus } from 'lucide-react'; // Added Plus
import { useAuth } from '../contexts/AuthContext.jsx';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner';
import { getEmbedUrl } from '../utils/embedUtils.js';

// [NEW] Admin Modal Component
const AddRecordModal = ({ levelName, levelId, onClose, onRecordAdded }) => {
    const { token } = useAuth();
    const [username, setUsername] = useState('');
    const [percent, setPercent] = useState(100);
    const [videoId, setVideoId] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await axios.post('/api/admin/add-record', {
                levelId,
                username,
                percent: parseInt(percent, 10),
                videoId,
            }, { headers: { Authorization: `Bearer ${token}` } });
            onRecordAdded(); // This will refetch the level data
            onClose(); // Close the modal
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add record.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4" onClick={onClose}>
            {/* Added stopPropagation to prevent modal closing on inner click */}
            <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg border border-gray-700" onClick={(e) => e.stopPropagation()}>
                <header className="p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">Add Record to "{levelName}"</h2>
                </header>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <input name="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" required className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-white" />
                    <input type="number" name="percent" value={percent} onChange={(e) => setPercent(e.target.value)} placeholder="Percent" required min="1" max="100" className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-white" />
                    <input name="videoId" value={videoId} onChange={(e) => setVideoId(e.target.value)} placeholder="Video URL or ID" required className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-white" />
                    
                    {error && <p className="text-red-400 text-center">{error}</p>}
                    <div className="flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg font-semibold bg-gray-600 hover:bg-gray-500 text-white">Cancel</button>
                        <button type="submit" disabled={isLoading} className="px-4 py-2 rounded-lg font-semibold bg-cyan-600 hover:bg-cyan-700 text-white disabled:bg-gray-500">{isLoading ? 'Adding...' : 'Add Record'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
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
  const [embedInfo, setEmbedInfo] = useState(null);

  // [NEW] State for the admin modal
  const [isAddRecordModalOpen, setIsAddRecordModalOpen] = useState(false);

  const fetchLevelAndHistory = async () => {
    // We don't set loading true here, only on the initial load
    setError(null);
    try {
      // Construct the correct API URL using levelId
      const apiUrl = `/api/level/${levelId}?list=${listType}-list`;
      const levelResponse = await axios.get(apiUrl);
      setLevel(levelResponse.data);

      if (levelResponse.data?.videoId && !embedInfo) { // Only set main embed on first load
        const embedResult = getEmbedUrl(levelResponse.data.videoId);
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
      setIsLoading(false); // Set loading false after all fetches
    }
  };


  useEffect(() => {
    window.scrollTo(0, 0);
    if (levelId) {
       setIsLoading(true); // Set loading true on initial load
       fetchLevelAndHistory();
    } else {
        setError("Invalid level ID.");
        setIsLoading(false);
    }
  }, [levelId, listType, token]); // Rerun if these change


  const handleCopyClick = () => {
    if (level?.levelId) {
      navigator.clipboard.writeText(level.levelId).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      });
    }
  };

  const handleRecordClick = (videoId) => {
    const embedResult = getEmbedUrl(videoId);
    setEmbedInfo(embedResult);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

    const handleRemoveRecord = async (recordVideoId) => {
    if (!window.confirm('Are you sure you want to permanently remove this record?')) return;
    try {
      // This endpoint is not in your api/index.js, but I'm assuming it exists
      await axios.post('/api/admin/remove-record',
        { levelId: level.id, recordVideoId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchLevelAndHistory(); // Refetch data to show removal
    } catch (err) {
      alert(`Failed to remove record: ${err.response?.data?.message || 'Server error'}`);
    }
  };

  // [NEW] Handler to be passed to the modal
  const handleRecordAdded = () => {
    fetchLevelAndHistory(); // Just refetch the level data
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
    <>
      {/* [NEW] Render the modal if open */}
      {isAddRecordModalOpen && (
        <AddRecordModal
          levelName={level.name}
          levelId={level.id} // Pass the level's DB ID
          onClose={() => setIsAddRecordModalOpen(false)}
          onRecordAdded={handleRecordAdded}
        />
      )}

      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Main Level Box */}
        <div className="relative bg-white dark:bg-gray-800 border-2 border-dotted border-cyan-400 backdrop-blur-sm p-4 sm:p-6 rounded-xl shadow-2xl">
          <button
            onClick={() => navigate(-1)}
            className="absolute top-4 left-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 hover:scale-110 transition-all"
            aria-label="Go back"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="text-center mb-4 pt-8 sm:pt-0">
            <h1 className="font-poppins text-5xl font-bold break-words text-cyan-600 dark:text-cyan-400">
              #{level.placement} - {level.name}
            </h1>
          </div>

          <div className="flex flex-wrap justify-center text-center mb-4 gap-x-8 gap-y-2 text-lg text-gray-600 dark:text-gray-300">
            <p><span className="font-bold text-gray-800 dark:text-white">Published by:</span> {level.creator}</p>
            <p><span className="font-bold text-gray-800 dark:text-white">{verifierLabel}</span> {level.verifier}</p>
            {level.attempts && (
              <p><span className="font-bold text-gray-800 dark:text-white">Attempts:</span> {level.attempts.toLocaleString()}</p>
            )}
          </div>

          {level.levelId && (
            <div className="text-center mb-6">
              <p className="text-lg text-gray-600 dark:text-gray-300">
                <span className="font-bold text-gray-800 dark:text-white">Level ID:</span>
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
            <div className="aspect-video w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex items-center justify-center bg-gray-50 dark:bg-gray-700/30">
              <p className="text-gray-500 dark:text-gray-400">No embeddable video found for this level.</p>
            </div>
          )}
        </div>

         {/* Position History Box */}
         {history.length > 0 && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 backdrop-blur-sm rounded-lg shadow-inner">
            <button
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className="w-full flex justify-between items-center p-4 text-xl font-bold text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <span>Position History</span>
              {isHistoryOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
            </button>
            {isHistoryOpen && (
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

        {/* Records Box */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 backdrop-blur-sm p-6 rounded-lg shadow-inner">
          {/* [NEW] Added flex container for title and button */}
          <div className="flex justify-center items-center text-center mb-4">
            <h2 className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">{t('records')}</h2>
            {/* [NEW] Admin "Add Record" Button */}
            {user && (user.role === 'ADMIN' || user.role === 'MODERATOR') && (
              <button
                onClick={() => setIsAddRecordModalOpen(true)}
                className="ml-4 p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-full transition-colors"
                title="Admin: Add Record"
              >
                <Plus size={24} />
              </button>
            )}
          </div>

          <ul className="text-center space-y-2 text-lg">
            <li>
              <button onClick={() => handleRecordClick(level.videoId)} className="text-gray-800 dark:text-gray-200 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
                <span className="font-bold">{level.verifier}</span>
                <span className="font-mono text-sm text-gray-500 dark:text-gray-400 ml-2">{recordVerifierLabel}</span>
              </button>
            </li>

            {level.records?.map((record, index) => (
              // Use a unique key, like videoId or a combination
              <li key={record.videoId || index} className="flex items-center justify-center gap-2 group text-gray-800 dark:text-gray-200">
                <button onClick={() => handleRecordClick(record.videoId)} className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
                  {record.username}
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
            ))}
          </ul>

          {!level.records?.length && (
            <p className="text-center text-gray-500 dark:text-gray-400 mt-4">{t('no_records_yet')}</p>
          )}
        </div>
      </div>
    </>
  );
}