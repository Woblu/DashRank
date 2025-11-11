// src/pages/PersonalRecordDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import axios from 'axios';
import { ChevronLeft, Film, Link as LinkIcon } from 'lucide-react';
import { getEmbedUrl } from '../utils/embedUtils.js';
import { useLanguage } from '../contexts/LanguageContext.jsx'; // 1. Import
import LoadingSpinner from '../components/LoadingSpinner.jsx'; // 2. Import

export default function PersonalRecordDetail() {
  const { recordId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { t } = useLanguage(); // 3. Initialize
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecord = async () => {
      if (!token || !recordId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await axios.get(`/api/personal-records/${recordId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRecord(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecord();
  }, [recordId, token]);

  // Note: Delete/Edit functionality is handled by <LevelCard> on the Home page
  // This page is just the read-only detail view.

  if (loading) return <LoadingSpinner message={t('loading_record_details')} />; // 4. Use Spinner & Translate

  if (!record) {
    return (
      <div className="text-center p-8 text-text-primary"> {/* THEMED */}
        <h1 className="text-2xl font-bold text-red-500">{t('record_not_found')}</h1> {/* Translated */}
        <button onClick={() => navigate('/progression')} className="mt-4 inline-flex items-center text-accent hover:underline"> {/* THEMED */}
          <ChevronLeft size={16} /> {t('back_to_progression')}
        </button> {/* Translated */}
      </div>
    );
  }

  const embedInfo = getEmbedUrl(record.videoUrl);
  const difficulty = record.difficulty?.replace('_', ' ');

  return (
    <div className="max-w-4xl mx-auto p-4 text-text-primary"> {/* THEMED */}
      <div className="mb-4">
        <button onClick={() => navigate('/progression')} className="flex items-center gap-2 text-accent hover:text-accent/80 transition-colors"> {/* THEMED */}
          <ChevronLeft size={20} />
          {t('back_to_progression')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Video Player */}
        <div className="md:col-span-2 aspect-video bg-primary-bg rounded-xl shadow-lg"> {/* THEMED */}
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
             <div className="w-full h-full rounded-xl shadow-lg bg-primary-bg flex flex-col items-center justify-center"> {/* THEMED */}
                <p className="text-text-muted">{t('video_preview_unavailable')}</p> {/* THEMED */}
                <a href={record.videoUrl} target="_blank" rel="noopener noreferrer" className="mt-2 text-accent hover:underline"> {/* THEMED */}
                    {t('view_original_video_link')}
                </a>
            </div>
          )}
        </div>

        {/* Details Card */}
        <div className="bg-ui-bg p-6 rounded-lg shadow-inner border border-primary-bg"> {/* THEMED */}
          <h2 className="text-2xl font-bold text-center text-accent mb-4">{t('record_details')}</h2> {/* THEMED */}
          
          <div className="space-y-3 text-text-on-ui/90"> {/* THEMED */}
            <p><span className="font-bold text-text-on-ui">{t('placement')}:</span> #{record.placement}</p> {/* THEMED */}
            <p><span className="font-bold text-text-on-ui">{t('level')}:</span> {record.levelName}</p> {/* THEMED */}
            <p><span className="font-bold text-text-on-ui">{t('difficulty')}:</span> {difficulty}</p> {/* THEMED */}
            {record.attempts && (
              <p><span className="font-bold text-text-on-ui">{t('attempts')}:</span> {record.attempts.toLocaleString()}</p> /* THEMED */
            )}
          </div>
          
          <div className="flex items-center justify-center gap-6 mt-6 border-t border-primary-bg pt-4"> {/* THEMED */}
              <a href={record.videoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-text-on-ui hover:text-accent transition-colors font-semibold"> {/* THEMED */}
                  <Film size={20} />
                  <span>{t('view_proof')}</span>
              </a>
          </div>
        </div>
      </div>
    </div>
  );
}