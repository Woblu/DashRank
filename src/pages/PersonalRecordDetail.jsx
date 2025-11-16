// src/pages/PersonalRecordDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import axios from 'axios';
import { ChevronLeft, Film, Link as LinkIcon } from 'lucide-react';
import { getEmbedUrl } from '../utils/embedUtils.js';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

export default function PersonalRecordDetail() {
  const { recordId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { t } = useLanguage();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // [FIX] Added error state

  useEffect(() => {
    const fetchRecord = async () => {
      if (!token || !recordId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null); // [FIX] Reset error on new fetch
      try {
        const res = await axios.get(`/api/personal-records/${recordId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRecord(res.data);
      } catch (err) {
        console.error(err);
        // [FIX] Set error message for the user
        setError(err.response?.data?.message || t('failed_to_load_record'));
      } finally {
        setLoading(false);
      }
    };
    fetchRecord();
  }, [recordId, token, t]); // [FIX] Added 't' to dependency array

  // Note: Delete/Edit functionality is handled by <LevelCard> on the Home page
  // This page is just the read-only detail view.

  if (loading) return <LoadingSpinner message={t('loading_record_details')} />;

  // [FIX] Show error message if fetching failed
  if (error) {
     return (
      <div className="text-center p-8 text-text-primary">
        <h1 className="text-2xl font-bold text-red-500">{error}</h1>
        <button onClick={() => navigate('/progression')} className="mt-4 inline-flex items-center text-accent hover:underline">
          <ChevronLeft size={16} /> {t('back_to_progression')}
        </button>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="text-center p-8 text-text-primary">
        <h1 className="text-2xl font-bold text-red-500">{t('record_not_found')}</h1>
        <button onClick={() => navigate('/progression')} className="mt-4 inline-flex items-center text-accent hover:underline">
          <ChevronLeft size={16} /> {t('back_to_progression')}
        </button>
      </div>
    );
  }

  const embedInfo = getEmbedUrl(record.videoUrl);
  const difficulty = record.difficulty?.replace('_', ' ');

  return (
    <div className="max-w-4xl mx-auto p-4 text-text-primary">
      <div className="mb-4">
        <button onClick={() => navigate('/progression')} className="flex items-center gap-2 text-accent hover:text-accent/80 transition-colors">
          <ChevronLeft size={20} />
          {t('back_to_progression')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Video Player */}
        <div className="md:col-span-2 aspect-video bg-primary-bg rounded-xl shadow-lg">
          {embedInfo && embedInfo.url ? (
            embedInfo.type === 'iframe' ? (
              <iframe
                width="100%" height="100%"
                src={embedInfo.url}
                title="Video Player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="rounded-xl shadow-lg"
              ></iframe>
            ) : (
              <video
                width="100%" height="100%"
                controls
                src={embedInfo.url}
                className="rounded-xl shadow-lg"
              >
                {t('video_not_supported')}
              </video>
            )
          ) : (
             <div className="w-full h-full rounded-xl shadow-lg bg-primary-bg flex flex-col items-center justify-center">
                <p className="text-text-muted">{t('video_preview_unavailable')}</p>
                <a href={record.videoUrl} target="_blank" rel="noopener noreferrer" className="mt-2 text-accent hover:underline">
                    {t('view_original_video_link')}
                </a>
             </div>
          )}
        </div>

        {/* Details Card */}
        <div className="bg-ui-bg p-6 rounded-lg shadow-inner border border-primary-bg">
          <h2 className="text-2xl font-bold text-center text-accent mb-4">{t('record_details')}</h2>
          
          <div className="space-y-3 text-text-on-ui/90">
            <p><span className="font-bold text-text-on-ui">{t('placement')}:</span> #{record.placement}</p>
            <p><span className="font-bold text-text-on-ui">{t('level')}:</span> {record.levelName}</p>
            <p><span className="font-bold text-text-on-ui">{t('difficulty')}:</span> {difficulty}</p>
            {record.attempts && (
              <p><span className="font-bold text-text-on-ui">{t('attempts')}:</span> {record.attempts.toLocaleString()}</p>
            )}
            {/* [FIX] Added Status field from your other version */}
            <p><span className="font-bold text-text-on-ui">{t('status')}:</span> {record.status === 'COMPLETED' ? t('completed') : t('in_progress')}</p>
          </div>
          
          <div className="flex items-center justify-center gap-6 mt-6 border-t border-primary-bg pt-4">
              <a href={record.videoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-text-on-ui hover:text-accent transition-colors font-semibold">
                  <Film size={20} />
                  <span>{t('view_proof')}</span>
              </a>
          </div>
        </div>
      </div>
    </div>
  );
}