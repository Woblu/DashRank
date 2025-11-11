// src/pages/layouts/LayoutDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, Music, User, Tag, BarChartHorizontal, ShieldAlert, Send } from 'lucide-react';
import { getEmbedUrl } from '../../utils/embedUtils.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import LayoutManagement from '../../components/LayoutManagement';
import LoadingSpinner from '../../components/LoadingSpinner';

const difficultyColors = {
  EASY: 'text-green-400',
  MEDIUM: 'text-yellow-400',
  HARD: 'text-orange-400',
  INSANE: 'text-red-400',
  EXTREME: 'text-purple-400',
};

const ReportModal = ({ layout, onClose, reportReason, setReportReason, handleReportSubmit, reportError, reportSuccess }) => {
  const { t } = useLanguage();
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-ui-bg rounded-xl shadow-2xl w-full max-w-lg border border-primary-bg" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b border-primary-bg">
          <h2 className="text-xl font-bold text-text-on-ui">{t('report_layout')}: {layout.levelName}</h2>
        </header>
        <form onSubmit={handleReportSubmit} className="p-6 space-y-4">
          <label className="block text-sm font-bold text-text-on-ui/90 mb-2">{t('reason_for_report')}</label>
          <textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            required
            placeholder={t('reason_placeholder')}
            className="w-full p-2 rounded-lg border border-primary-bg bg-primary-bg text-text-primary"
            rows="4"
          ></textarea>
          {reportError && <p className="text-red-400 text-sm">{reportError}</p>}
          {reportSuccess && <p className="text-green-400 text-sm">{reportSuccess}</p>}
          <div className="flex justify-end gap-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg font-semibold bg-primary-bg text-text-primary hover:bg-accent/20 transition-colors">{t('cancel')}</button>
            <button type="submit" className="px-4 py-2 rounded-lg font-semibold bg-accent text-text-on-ui hover:opacity-90 transition-colors">{t('submit_report')}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ApplyModal = ({ layout, onClose, message, setMessage, handleApplySubmit, applyError, applySuccess }) => {
  const { t } = useLanguage();
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-ui-bg rounded-xl shadow-2xl w-full max-w-lg border border-primary-bg" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b border-primary-bg">
          <h2 className="text-xl font-bold text-text-on-ui">{t('apply_to_decorate')}: {layout.levelName}</h2>
        </header>
        <form onSubmit={handleApplySubmit} className="p-6 space-y-4">
          <label className="block text-sm font-bold text-text-on-ui/90 mb-2">{t('message_to_creator')}</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('message_placeholder')}
            className="w-full p-2 rounded-lg border border-primary-bg bg-primary-bg text-text-primary"
            rows="4"
          ></textarea>
          {applyError && <p className="text-red-400 text-sm">{applyError}</p>}
          {applySuccess && <p className="text-green-400 text-sm">{applySuccess}</p>}
          <div className="flex justify-end gap-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg font-semibold bg-primary-bg text-text-primary hover:bg-accent/20 transition-colors">{t('cancel')}</button>
            <button type="submit" className="px-4 py-2 rounded-lg font-semibold bg-accent text-text-on-ui hover:opacity-90 transition-colors">{t('send_application')}</button>
          </div>
        </form>
      </div>
    </div>
  );
};


export default function LayoutDetailPage() {
  const { layoutId } = useParams();
  const { user, token } = useAuth();
  const { t } = useLanguage();
  const [layout, setLayout] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [embedInfo, setEmbedInfo] = useState(null);
  
  const [isOwner, setIsOwner] = useState(false);
  
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  
  const [reportReason, setReportReason] = useState('');
  const [reportError, setReportError] = useState('');
  const [reportSuccess, setReportSuccess] = useState('');
  
  const [message, setMessage] = useState('');
  const [applyError, setApplyError] = useState('');
  const [applySuccess, setApplySuccess] = useState('');

  useEffect(() => {
    const fetchLayout = async () => {
      setIsLoading(true);
      try {
        const res = await axios.get(`/api/layouts/${layoutId}`);
        setLayout(res.data);
        if (res.data.videoUrl) {
          setEmbedInfo(getEmbedUrl(res.data.videoUrl));
        }
        if (user && res.data.creator.id === user.userId) {
          setIsOwner(true);
        }
      } catch (err) {
        setError(t('layout_load_failed'));
      } finally {
        setIsLoading(false);
      }
    };
    fetchLayout();
  }, [layoutId, user, t]);

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    setReportError('');
    setReportSuccess('');
    try {
      await axios.post('/api/layout-reports', 
        { layoutId, reason: reportReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReportSuccess(t('report_success'));
      setTimeout(() => setIsReportModalOpen(false), 2000);
    } catch (err) {
      setReportError(err.response?.data?.message || t('report_failed'));
    }
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    setApplyError('');
    setApplySuccess('');
    try {
      await axios.post('/api/collaboration-requests',
        { layoutId, message },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setApplySuccess(t('application_sent_success'));
      setTimeout(() => setIsApplyModalOpen(false), 2000);
    } catch (err) {
      setApplyError(err.response?.data?.message || t('application_sent_failed'));
    }
  };

  if (isLoading) return <LoadingSpinner message={t('loading_layout')} />;
  if (error) return <p className="text-center text-red-500">{error}</p>;
  if (!layout) return null;

  return (
    <>
      <div className="max-w-6xl mx-auto p-4 text-text-primary">
        <div className="mb-6">
          <Link to="/layouts" className="flex items-center gap-2 text-accent hover:text-accent/80 transition-colors">
            <ChevronLeft size={20} />
            {t('back_to_layout_gallery')}
          </Link>
        </div>

        {/* --- MAIN CARD: THIS IS THE FIX --- */}
        {/* Original was bg-gray-900/80. In dark mode, primary-bg is gray-900. This is correct. */}
        {/* In Mono (light) mode, primary-bg is gray-100. This is also correct. */}
        <div className="bg-primary-bg/80 backdrop-blur-sm p-6 rounded-xl shadow-2xl border border-primary-bg mb-8">
          
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="font-poppins text-5xl font-bold break-words text-text-primary">{layout.levelName}</h1>
            <p className="text-lg text-text-muted mt-2">{t('by')} {layout.creator.username}</p>
          </div>
          
          {/* Video Embed */}
          {embedInfo && embedInfo.url ? (
            <div className="aspect-video w-full border border-primary-bg rounded-xl overflow-hidden bg-primary-bg">
              {embedInfo.type === 'iframe' ? (
                <iframe key={embedInfo.url} width="100%" height="100%" src={embedInfo.url} title="Video Player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
              ) : (
                <video key={embedInfo.url} width="100%" height="100%" src={embedInfo.url} controls></video>
              )}
            </div>
          ) : (
            <div className="aspect-video w-full border-2 border-dashed border-primary-bg rounded-xl flex items-center justify-center bg-ui-bg/50">
              <p className="text-text-muted">{t('no_embeddable_video')}</p>
            </div>
          )}
        </div>
        
        {/* Layout Management Dashboard (for owner) */}
        {isOwner && (
          <LayoutManagement layout={layout} />
        )}
        
        {/* Public Layout Info */}
        {/* --- SUB-CARDS: THIS IS THE FIX --- */}
        {/* Original was bg-gray-800/50. In dark mode, ui-bg is gray-800. This is correct. */}
        {/* In Mono (light) mode, ui-bg is white. This is also correct. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-ui-bg/50 p-6 rounded-xl border border-primary-bg">
            <h2 className="text-xl font-bold mb-4 text-text-primary">{t('description')}</h2>
            <p className="text-text-muted">{layout.description || t('no_description_provided')}</p>
          </div>
          <div className="bg-ui-bg/50 p-6 rounded-xl border border-primary-bg">
            <h2 className="text-xl font-bold mb-4 text-text-primary">{t('song')}</h2>
            <p className="text-text-muted flex items-center gap-2">
              <Music size={18} /> {layout.songName || t('unknown_song')}
            </p>
          </div>
          <div className="bg-ui-bg/50 p-6 rounded-xl border border-primary-bg">
            <h2 className="text-xl font-bold mb-4 text-text-primary">{t('info')}</h2>
            <div className="space-y-2 text-text-muted">
              <p className="flex items-center gap-2"><User size={18} /> {t('creator')}: {layout.creator.username}</p>
              <p className={`flex items-center gap-2 font-bold ${difficultyColors[layout.difficulty]}`}><BarChartHorizontal size={18} /> {t('difficulty')}: {layout.difficulty}</p>
            </div>
          </div>
          <div className="bg-ui-bg/50 p-6 rounded-xl border border-primary-bg">
            <h2 className="text-xl font-bold mb-4 text-text-primary"><Tag/> {t('tags')}</h2>
            <div className="flex flex-wrap gap-2">
              {layout.tags?.length > 0 ? layout.tags.map(tag => (
                /* --- TAGS: THIS IS THE FIX --- */
                /* Original was bg-gray-700. button-bg is gray-700 (dark) / gray-200 (light). Correct. */
                <span key={tag} className="text-sm bg-button-bg text-text-muted px-3 py-1 rounded-full">{tag}</span>
              )) : <p className="text-sm text-text-muted">{t('no_tags_provided')}</p>}
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="space-y-4">
          <button
            onClick={() => setIsApplyModalOpen(true)}
            disabled={isOwner || !user}
            className="w-full flex items-center justify-center gap-2 bg-accent hover:opacity-90 text-text-on-ui font-bold py-3 px-4 rounded-lg shadow-lg shadow-accent/20 disabled:bg-ui-bg disabled:text-text-muted disabled:cursor-not-allowed disabled:shadow-none"
          >
            {isOwner ? t('this_is_your_layout') : (user ? t('request_to_decorate') : t('login_to_request'))}
          </button>
          <button onClick={() => setIsReportModalOpen(true)} disabled={!user} className="w-full flex items-center justify-center gap-2 bg-red-900/50 hover:bg-red-900/80 text-red-400 font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            <ShieldAlert size={18} /> {user ? t('report_this_layout') : t('login_to_report')}
          </button>
        </div>
      </div>

      {isReportModalOpen && (
        <ReportModal 
          layout={layout}
          onClose={() => setIsReportModalOpen(false)}
          reportReason={reportReason}
          setReportReason={setReportReason}
          handleReportSubmit={handleReportSubmit}
          reportError={reportError}
          reportSuccess={reportSuccess}
        />
      )}
      
      {isApplyModalOpen && (
        <ApplyModal
          layout={layout}
          onClose={() => setIsApplyModalOpen(false)}
          message={message}
          setMessage={setMessage}
          handleApplySubmit={handleApplySubmit}
          applyError={applyError}
          applySuccess={applySuccess}
        />
      )}
    </>
  );
}