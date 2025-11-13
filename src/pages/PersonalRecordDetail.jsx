import React, { useState, useEffect } from 'react';
import { useParams, useNavigate }_ from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { getYouTubeEmbedUrl } from '../utils/embedUtils'; // Using the util from your file structure
import { ArrowLeft } from 'lucide-react';

export default function PersonalRecordDetail() {
  const { recordId } = useParams();
  const { token } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [record, setRecord] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token || !recordId) {
      setIsLoading(false);
      return;
    }

    const fetchRecord = async () => {
      try {
        setIsLoading(true);
        // This API endpoint corresponds to your 'getPersonalRecordById' handler
        const response = await axios.get(`/api/personal-records/${recordId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRecord(response.data);
      } catch (err) {
        console.error('Failed to fetch record:', err);
        setError(err.response?.data?.message || t('failed_to_load_record'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecord();
  }, [recordId, token, t]);

  const embedUrl = record ? getYouTubeEmbedUrl(record.videoUrl) : null;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <button
        onClick={() => navigate('/progression')}
        className="flex items-center gap-2 text-accent mb-4 hover:underline"
      >
        <ArrowLeft size={18} />
        {t('back_to_progression')}
      </button>

      {isLoading && <LoadingSpinner message={t('loading_record')} />}
      
      {error && <p className="text-center text-red-500 mt-8">{error}</p>}

      {record && !isLoading && (
        <div className="bg-ui-bg border border-primary-bg rounded-xl shadow-lg overflow-hidden">
          {/* Video Embed */}
          {embedUrl ? (
            <div className="aspect-video">
              <iframe
                width="100%"
                height="100%"
                src={embedUrl}
                title={`Video for ${record.levelName}`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          ) : (
            record.thumbnailUrl && (
              <img src={record.thumbnailUrl} alt={record.levelName} className="w-full object-cover" />
            )
          )}

          {/* Record Details */}
          <div className="p-6">
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              {record.levelName}
            </h1>
            <div className="flex flex-wrap gap-x-6 gap-y-2 mb-4 text-text-muted">
              <span className="font-semibold">
                {t('placement')}: <strong className="text-text-primary">#{record.placement}</strong>
              </span>
              <span className="font-semibold">
                {t('difficulty')}: <strong className="text-text-primary">{record.difficulty}</strong>
              </span>
              {record.attempts && (
                 <span className="font-semibold">
                  {t('attempts')}: <strong className="text-text-primary">{record.attempts.toLocaleString()}</strong>
                </span>
              )}
               <span className="font-semibold">
                {t('status')}: <strong className="text-text-primary">{record.status === 'COMPLETED' ? t('completed') : t('in_progress')}</strong>
              </span>
            </div>
            
            <a 
              href={record.videoUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 rounded-lg font-semibold bg-accent hover:opacity-90 text-text-on-ui transition-colors"
            >
              {t('view_on_youtube')}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}