import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx'; // 1. Import
import { PlusCircle, Save, X } from 'lucide-react';

export default function AddPersonalRecordForm({ onClose, onRecordAdded, recordCount, existingRecord }) {
  const { token } = useAuth();
  const { t } = useLanguage(); // 2. Initialize
  
  const isEditMode = Boolean(existingRecord);

  const [placement, setPlacement] = useState(recordCount + 1);
  const [levelName, setLevelName] = useState('');
  const [difficulty, setDifficulty] = useState('EXTREME');
  const [attempts, setAttempts] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      setPlacement(existingRecord.placement);
      setLevelName(existingRecord.levelName);
      setDifficulty(existingRecord.difficulty);
      setAttempts(existingRecord.attempts || '');
      setVideoUrl(existingRecord.videoUrl);
      setThumbnailUrl(existingRecord.thumbnailUrl || '');
    }
  }, [existingRecord, isEditMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const recordData = { placement, levelName, difficulty, attempts, videoUrl, thumbnailUrl };

    try {
      if (isEditMode) {
        await axios.put(`/api/personal-records/${existingRecord.id}`, recordData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post('/api/personal-records', recordData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      onRecordAdded();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-ui-bg rounded-xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}> {/* THEMED */}
        <header className="relative p-4 border-b border-primary-bg flex justify-end items-center"> {/* THEMED */}
          <h2 className="absolute left-1/2 -translate-x-1/2 text-xl font-bold text-text-on-ui"> {/* THEMED */}
            {isEditMode ? t('edit_record') : t('add_to_progression_list')}
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-primary-bg z-10"> {/* THEMED */}
            <X className="w-6 h-6 text-text-on-ui" /> {/* THEMED */}
          </button>
        </header>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-text-on-ui/90 mb-2">{t('placement')}</label> {/* THEMED */}
            <input type="number" value={placement} onChange={(e) => setPlacement(e.target.value)} required min="1" disabled={isSubmitting} className="w-full p-2 rounded-lg border border-primary-bg bg-primary-bg text-text-primary" /> {/* THEMED */}
          </div>
          <div>
            <label className="block text-sm font-bold text-text-on-ui/90 mb-2">{t('attempts_optional')}</label> {/* THEMED */}
            <input type="number" value={attempts} onChange={(e) => setAttempts(e.target.value)} min="1" disabled={isSubmitting} className="w-full p-2 rounded-lg border border-primary-bg bg-primary-bg text-text-primary" /> {/* THEMED */}
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-text-on-ui/90 mb-2">{t('level_name')}</label> {/* THEMED */}
            <input type="text" value={levelName} onChange={(e) => setLevelName(e.target.value)} required disabled={isSubmitting} className="w-full p-2 rounded-lg border border-primary-bg bg-primary-bg text-text-primary" /> {/* THEMED */}
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-text-on-ui/90 mb-2">{t('demon_difficulty')}</label> {/* THEMED */}
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} required disabled={isSubmitting} className="w-full p-2 rounded-lg border border-primary-bg bg-primary-bg text-text-primary"> {/* THEMED */}
              <option value="EASY">{t('difficulty_easy')}</option>
              <option value="MEDIUM">{t('difficulty_medium')}</option>
              <option value="HARD">{t('difficulty_hard')}</option>
              <option value="INSANE">{t('difficulty_insane')}</option>
              <option value="EXTREME">{t('difficulty_extreme')}</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-text-on-ui/90 mb-2">{t('video_proof_desc')}</label> {/* THEMED */}
            <input type="text" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} required placeholder="https://..." disabled={isSubmitting} className="w-full p-2 rounded-lg border border-primary-bg bg-primary-bg text-text-primary" /> {/* THEMED */}
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-text-on-ui/90 mb-2">{t('thumbnail_url_optional')}</label> {/* THEMED */}
            <p className="text-xs text-text-muted mb-2">{t('thumbnail_desc')}</p> {/* THEMED */}
            <input 
              type="text" 
              value={thumbnailUrl} 
              onChange={(e) => setThumbnailUrl(e.target.value)} 
              placeholder="https://i.imgur.com/..." 
              disabled={isSubmitting} 
              className="w-full p-2 rounded-lg border border-primary-bg bg-primary-bg text-text-primary" /* THEMED */
            />
          </div>
          
          {error && <p className="md:col-span-2 text-red-400 text-center">{error}</p>}
          
          <button type="submit" disabled={isSubmitting} className="md:col-span-2 w-full flex items-center justify-center gap-2 bg-accent hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed text-text-on-ui font-bold py-3 px-4 rounded-lg"> {/* THEMED */}
            {isEditMode ? <><Save className="w-5 h-5" /> {t('update_record')}</> : <><PlusCircle className="w-5 h-5" /> {t('add_record')}</>}
          </button>
        </form>
      </div>
    </div>
  );
}