// src/components/SubmissionForm.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx'; // 1. Import

export default function SubmissionForm() {
  const { user, token } = useAuth();
  const { t } = useLanguage(); // 2. Initialize
  
  const [playerName, setPlayerName] = useState(user.username);
  const [levelName, setLevelName] = useState('');
  const [percent, setPercent] = useState(100);
  const [videoId, setVideoId] = useState('');
  const [rawFootageLink, setRawFootageLink] = useState('');
  const [notes, setNotes] =useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setPlayerName(user.username);
  }, [user.username]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const response = await axios.post('/api/submissions/create', {
        playerName,
        levelName,
        percent: Number(percent),
        videoId,
        rawFootageLink,
        notes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess(t('submission_success')); // Translated
      // Clear the form
      setLevelName('');
      setPercent(100);
      setVideoId('');
      setRawFootageLink('');
      setNotes('');
      
    } catch (err) {
      setError(err.response?.data?.message || t('submission_failed')); // Translated
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // [FIX] Removed outer card wrapper, parent page provides it
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-red-400 text-center">{error}</p>}
      {success && <p className="text-green-400 text-center">{success}</p>}
      
      <div>
        <label htmlFor="playerName" className="block text-lg font-bold text-text-on-ui/90 mb-1">{t('player_name')}</label> {/* THEMED */}
        <p className="text-sm text-text-muted mb-2">{t('player_name_desc')}</p> {/* THEMED */}
        <input type="text" id="playerName" value={playerName} onChange={(e) => setPlayerName(e.target.value)} required disabled={isSubmitting} className="w-full p-2 rounded-lg border border-primary-bg bg-primary-bg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent" /> {/* THEMED */}
      </div>

      <div>
        <label htmlFor="levelName" className="block text-lg font-bold text-text-on-ui/90 mb-1">{t('level_name')}</label> {/* THEMED */}
        <p className="text-sm text-text-muted mb-2">{t('level_name_desc')}</p> {/* THEMED */}
        <input type="text" id="levelName" value={levelName} onChange={(e) => setLevelName(e.target.value)} required disabled={isSubmitting} className="w-full p-2 rounded-lg border border-primary-bg bg-primary-bg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent" /> {/* THEMED */}
      </div>

      <div>
        <label htmlFor="percent" className="block text-lg font-bold text-text-on-ui/90 mb-1">{t('percent')}</label> {/* THEMED */}
        <input type="number" id="percent" value={percent} onChange={(e) => setPercent(e.target.value)} required min="1" max="100" disabled={isSubmitting} className="w-full p-2 rounded-lg border border-primary-bg bg-primary-bg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent" /> {/* THEMED */}
      </div>

      <div>
        <label htmlFor="videoId" className="block text-lg font-bold text-text-on-ui/90 mb-1">{t('public_video_link')}</label> {/* THEMED */}
        <p className="text-sm text-text-muted mb-2">{t('public_video_desc')}</p> {/* THEMED */}
        <input type="text" id="videoId" value={videoId} onChange={(e) => setVideoId(e.target.value)} required placeholder="https://..." disabled={isSubmitting} className="w-full p-2 rounded-lg border border-primary-bg bg-primary-bg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent" /> {/* THEMED */}
      </div>

      <div>
        <label htmlFor="rawFootageLink" className="block text-lg font-bold text-text-on-ui/90 mb-1">{t('raw_footage_link')}</label> {/* THEMED */}
        <p className="text-sm text-text-muted mb-2">{t('raw_footage_desc')}</p> {/* THEMED */}
        <input type="text" id="rawFootageLink" value={rawFootageLink} onChange={(e) => setRawFootageLink(e.target.value)} required disabled={isSubmitting} className="w-full p-2 rounded-lg border border-primary-bg bg-primary-bg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent" /> {/* THEMED */}
      </div>

      <div>
        <label htmlFor="notes" className="block text-lg font-bold text-text-on-ui/90 mb-1">{t('notes')}</label> {/* THEMED */}
        <p className="text-sm text-text-muted mb-2">{t('notes_desc')}</p> {/* THEMED */}
        <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows="3" disabled={isSubmitting} className="w-full p-2 rounded-lg border border-primary-bg bg-primary-bg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"></textarea> {/* THEMED */}
      </div>
      
      <p className="text-xs text-text-muted text-center">{t('submission_guidelines_ack')}</p> {/* THEMED */}
      
      <button type="submit" disabled={isSubmitting} className="w-full flex items-center justify-center gap-2 bg-accent hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed text-text-on-ui font-bold py-3 px-4 rounded-lg"> {/* THEMED */}
        {isSubmitting ? t('submitting') : <><Send className="w-5 h-5" /> {t('submit_record')}</>}
      </button>
    </form>
  );
}