// src/pages/PersonalRecordDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner';
import { getEmbedUrl } from '../utils/embedUtils.js';

export default function PersonalRecordDetail() {
  const { recordId } = useParams(); // Use recordId from PersonalRecordDetail
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { token } = useAuth(); // Use token from PersonalRecordDetail

  const [record, setRecord] = useState(null); // Use record state from PersonalRecordDetail
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [embedInfo, setEmbedInfo] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!recordId || !token) {
      setIsLoading(false);
      return;
    }
    
    const fetchRecord = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Use the API endpoint from PersonalRecordDetail
        const res = await axios.get(`/api/personal-records/${recordId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRecord(res.data);
        
        // Set embed info once data is fetched
        if (res.data?.videoUrl) {
          const embedResult = getEmbedUrl(res.data.videoUrl);
          setEmbedInfo(embedResult);
        }
        
      } catch (err) {
        console.error("Failed to fetch record details:", err);
        const errMsg = err.response?.status === 404
          ? t('record_not_found')
          : (err.response?.data?.message || t('failed_to_load_record'));
        setError(errMsg);
        setRecord(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecord();
  }, [recordId, token, t]); // Use dependencies from PersonalRecordDetail

  if (isLoading) return <LoadingSpinner message={t('loading_record_details')} />; // Use message from PersonalRecordDetail

  if (error || !record) {
    return (
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold text-red-500">{error || t('record_not_found')}</h1>
        <button onClick={() => navigate('/progression')} className="mt-4 inline-flex items-center text-accent hover:underline">
          <ChevronLeft size={16} /> {t('back_to_progression')}
        </button>
      </div>
    );
  }

  // Get difficulty and status from the record
  const difficulty = record.difficulty?.replace('_', ' ');
  const status = record.status === 'COMPLETED' ? t('completed') : t('in_progress');

  return (
    <>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Main Level Box (Adapted for Record) */}
        <div className="relative bg-ui-bg border-2 border-dotted border-accent backdrop-blur-sm p-4 sm:p-6 rounded-xl shadow-2xl">
          <button
            onClick={() => navigate('/progression')} // Navigate back to progression
            className="absolute top-4 left-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-primary-bg text-text-primary hover:bg-accent/10 hover:scale-110 transition-all"
            aria-label="Go back to progression"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="text-center mb-4 pt-8 sm:pt-0">
            <h1 className="font-poppins text-5xl font-bold break-words text-accent">
              {/* Map record data */}
              #{record.placement} - {record.levelName}
            </h1>
          </div>

          <div className="flex flex-wrap justify-center text-center mb-4 gap-x-8 gap-y-2 text-lg text-text-muted">
            {/* Map record data */}
            <p><span className="font-bold text-text-on-ui">{t('difficulty')}:</span> {difficulty}</p>
            <p><span className="font-bold text-text-on-ui">{t('status')}:</span> {status}</p>
            {record.attempts && (
              <p><span className="font-bold text-text-on-ui">{t('attempts')}:</span> {record.attempts.toLocaleString()}</p>
            )}
          </div>

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

        {/* Removed Position History Box (Doesn't apply to a single record) */}
        
        {/* Removed Records Box (Doesn't apply to a single record) */}
      </div>
    </>
  );
}