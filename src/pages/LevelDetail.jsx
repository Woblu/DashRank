// src/pages/LevelDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { ChevronLeft, Trash2, ChevronDown, ChevronUp, Plus, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner';
import { getEmbedUrl } from '../utils/embedUtils.js';

// Admin Modal Component
const AddRecordModal = ({ levelName, levelId, onClose, onRecordAdded }) => {
    const { token } = useAuth();
    const { t } = useLanguage(); 
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
            onRecordAdded();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add record.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-ui-bg rounded-xl shadow-2xl w-full max-w-lg border border-primary-bg" onClick={(e) => e.stopPropagation()}> 
                <header className="p-4 border-b border-primary-bg"> 
                    <h2 className="text-xl font-bold text-text-on-ui">{t('add_record_to', { name: levelName })}</h2> 
                </header>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <input name="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t('username')} required className="w-full p-2 rounded-lg border border-primary-bg bg-primary-bg text-text-primary" /> 
                    <input type="number" name="percent" value={percent} onChange={(e) => setPercent(e.target.value)} placeholder={t('percent')} required min="1" max="100" className="w-full p-2 rounded-lg border border-primary-bg bg-primary-bg text-text-primary" /> 
                    <input name="videoId" value={videoId} onChange={(e) => setVideoId(e.target.value)} placeholder={t('video_url_or_id')} required className="w-full p-2 rounded-lg border border-primary-bg bg-primary-bg text-text-primary" /> 
                    
                    {error && <p className="text-red-400 text-center">{error}</p>}
                    <div className="flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg font-semibold bg-primary-bg text-text-primary hover:bg-accent/20 transition-colors">{t('cancel')}</button> 
                        <button type="submit" disabled={isLoading} className="px-4 py-2 rounded-lg font-semibold bg-accent text-text-on-ui hover:opacity-90 transition-colors disabled:bg-gray-500">{isLoading ? t('adding') : t('add_record')}</button> 
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

  const [isAddRecordModalOpen, setIsAddRecordModalOpen] = useState(false);

  const fetchLevelAndHistory = async () => {
    setError(null);
    try {
      const apiUrl = `/api/level/${levelId}?list=${listType}-list`;
      const levelResponse = await axios.get(apiUrl);
      setLevel(levelResponse.data);

      if (levelResponse.data?.videoId && !embedInfo) {
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
      const errMsg = err.response?.status === 404
        ? t('level_not_found_on_list', { levelId: levelId, listType: listType })
        : t('failed_to_load_level_data');
      setError(errMsg);
      setLevel(null);
    } finally {
      setIsLoading(false);
    }
  };


  useEffect(() => {
    window.scrollTo(0, 0);
    if (levelId) {
       setIsLoading(true);
       fetchLevelAndHistory();
    } else {
        setError("Invalid level ID.");
        setIsLoading(false);
    }
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
    const embedResult = getEmbedUrl(videoId);
    setEmbedInfo(embedResult);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRemoveRecord = async (recordVideoId) => {
    if (!window.confirm(t('are_you_sure_remove_record'))) return;
    try {
      await axios.post('/api/admin/remove-record',
        { levelId: level.id, recordVideoId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchLevelAndHistory();
    } catch (err) {
      alert(t('failed_to_remove_record', { error: err.response?.data?.message || 'Server error' }));
    }
  };

  const handleMoveRecord = async (recordVideoId, direction) => {
    try {
      await axios.post('/api/admin/move-record', 
        { levelId: level.id, recordVideoId, direction },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchLevelAndHistory(); 
    } catch (err) {
      alert(`Failed to move record: ${err.response?.data?.message || 'Server error'}`);
    }
  };

  const handleRecordAdded = () => {
    fetchLevelAndHistory();
  };

  if (isLoading) return <LoadingSpinner message={t('loading_level_details')} />;

  if (error || !level) {
    return (
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold text-red-500">{error || t('level_not_found_generic')}</h1> 
        <button onClick={() => navigate(`/`)} className="mt-4 inline-flex items-center text-accent hover:underline"> 
          <ChevronLeft size={16} /> {t('go_back_to_list')}
        </button>
      </div>
    );
  }

  const verifierLabel = level.list === 'future-list' ? t('verification_status') : t('verified_by');
  // [FIX] Changed to always be (Verifier) or (Status Verifier) based on your request to change the text
  const recordVerifierLabel = level.list === 'future-list' ? '(Status Verifier)' : '(Verifier)';

  return (
    <>
      {isAddRecordModalOpen && (
        <AddRecordModal
          levelName={level.name}
          levelId={level.id}
          onClose={() => setIsAddRecordModalOpen(false)}
          onRecordAdded={handleRecordAdded}
        />
      )}

      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Main Level Box */}
        <div className="relative bg-ui-bg border-2 border-dotted border-accent backdrop-blur-sm p-4 sm:p-6 rounded-xl shadow-2xl"> 
          <button
            onClick={() => navigate(-1)}
            className="absolute top-4 left-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-primary-bg text-text-primary hover:bg-accent/10 hover:scale-110 transition-all"
            aria-label="Go back"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="text-center mb-4 pt-8 sm:pt-0">
            <h1 className="font-poppins text-5xl font-bold break-words text-accent"> 
              #{level.placement} - {level.name}
            </h1>
          </div>

          <div className="flex flex-wrap justify-center text-center mb-4 gap-x-8 gap-y-2 text-lg text-text-muted"> 
            <p><span className="font-bold text-text-on-ui">{t('published_by')}</span> {level.creator}</p> 
            <p><span className="font-bold text-text-on-ui">{verifierLabel}</span> {level.verifier}</p> 
            {level.attempts && (
              <p><span className="font-bold text-text-on-ui">{t('attempts')}</span> {level.attempts.toLocaleString()}</p>
            )}
          </div>

          {level.levelId && (
            <div className="text-center mb-6">
              <p className="text-lg text-text-muted"> 
                <span className="font-bold text-text-on-ui">{t('level_id')}</span> 
                <button
                  onClick={handleCopyClick}
                  className="ml-2 px-3 py-1 rounded-md font-mono bg-primary-bg border border-primary-bg/50 hover:bg-accent/10 transition-colors text-text-muted"
                >
                  {isCopied ? t('copied') : level.levelId}
                </button>
              </p>
            </div>
          )}

          {/* [FIX] Description Display - Centered, Italic, Quoted */}
          {level.description && (
            <div className="text-center mb-6 px-4 italic text-text-on-ui/90 text-lg">
              "{level.description}"
            </div>
          )}

          {/* Video Embed */}
          {embedInfo && embedInfo.url ? (
            <div className="aspect-video w-full border-2 border-primary-bg rounded-xl overflow-hidden bg-black"> 
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
            <div className="aspect-video w-full border-2 border-dashed border-primary-bg rounded-xl flex items-center justify-center bg-primary-bg/50"> 
              <p className="text-text-muted">{t('no_embeddable_video')}</p> 
            </div>
          )}
        </div>

         {/* Position History Box */}
         {history.length > 0 && (
          <div className="bg-ui-bg border border-primary-bg backdrop-blur-sm rounded-lg shadow-inner"> 
            <button
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className="w-full flex justify-between items-center p-4 text-xl font-bold text-text-on-ui hover:bg-primary-bg transition-colors"
            >
              <span>{t('position_history')}</span>
              {isHistoryOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
            </button>
            {isHistoryOpen && (
              <div className="p-4 border-t border-primary-bg"> 
                <ul className="space-y-2">
                  {history.map(change => (
                    <li key={change.id} className="text-text-on-ui flex justify-between items-center text-sm"> 
                      <span>{change.description}</span>
                      <span className="text-text-muted">{new Date(change.createdAt).toLocaleString()}</span> 
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Records Box */}
        <div className="bg-ui-bg border border-primary-bg backdrop-blur-sm p-6 rounded-lg shadow-inner"> 
          <div className="flex justify-center items-center text-center mb-4">
            <h2 className="text-3xl font-bold text-accent">{t('records')}</h2> 
            {user && (user.role === 'ADMIN' || user.role === 'MODERATOR') && (
              <button
                onClick={() => setIsAddRecordModalOpen(true)}
                className="ml-4 p-2 text-accent hover:bg-accent/20 rounded-full transition-colors"
                title={t('admin_add_record')}
              >
                <Plus size={24} />
              </button>
            )}
          </div>

          <ul className="text-center space-y-2 text-lg">
            <li>
              <button onClick={() => handleRecordClick(level.videoId)} className="text-text-on-ui hover:text-accent transition-colors"> 
                {/* [FIX] Changed text to use the new label */}
                <span className="font-bold">{level.verifier}</span> 
                <span className="font-mono text-sm text-text-muted ml-2">{recordVerifierLabel}</span> 
              </button>
            </li>

            {level.records?.map((record, index) => (
              <li key={record.videoId || index} className="flex items-center justify-center gap-2 group text-text-on-ui"> 
                
                {user && (user.role === 'ADMIN' || user.role === 'MODERATOR') && (
                  <button
                    onClick={() => handleMoveRecord(record.videoId, 'up')}
                    disabled={index === 0}
                    className="p-1 text-accent hover:bg-accent/20 rounded-full transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move Up"
                  >
                    <ArrowUpCircle className="w-4 h-4" />
                  </button>
                )}

                <button onClick={() => handleRecordClick(record.videoId)} className="hover:text-accent transition-colors"> 
                  {record.username}
                  <span className="font-mono text-sm text-text-muted ml-2">({record.percent}%)</span> 
                </button>
                
                {user && (user.role === 'ADMIN' || user.role === 'MODERATOR') && (
                  <button
                    onClick={() => handleMoveRecord(record.videoId, 'down')}
                    disabled={index === level.records.length - 1}
                    className="p-1 text-accent hover:bg-accent/20 rounded-full transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move Down"
                  >
                    <ArrowDownCircle className="w-4 h-4" />
                  </button>
                )}

                {user && (user.role === 'ADMIN' || user.role === 'MODERATOR') && (
                  <button
                    onClick={() => handleRemoveRecord(record.videoId)}
                    className="p-1 text-red-500 hover:bg-red-500/10 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                    title={t('remove_record')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>

          {!level.records?.length && (
            <p className="text-center text-text-muted mt-4">{t('no_records_yet')}</p>
          )}
        </div>
      </div>
    </>
  );
}