// src/components/forms/LayoutSubmissionForm.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';

// [FIX] This array is for the values
const gameplayTags = [
  'WAVE', 'SHIP', 'TIMING', 'MEMORY', 'STRAIGHT_FLY', 'SPAM', 'DUAL',
  'UFO', 'BALL', 'ROBOT', 'SPIDER', 'SWING', 'PLATFORMER'
];

// [FIX] This map is for the display names
const tagDisplayNames = {
  'WAVE': 'Wave',
  'SHIP': 'Ship',
  'TIMING': 'Timing',
  'MEMORY': 'Memory',
  'STRAIGHT_FLY': 'Straight Fly',
  'SPAM': 'Spam',
  'DUAL': 'Dual',
  'UFO': 'UFO',
  'BALL': 'Ball',
  'ROBOT': 'Robot',
  'SPIDER': 'Spider',
  'SWING': 'Swing',
  'PLATFORMER': 'Platformer'
};

const demonDifficulties = ['EASY', 'MEDIUM', 'HARD', 'INSANE', 'EXTREME'];

export default function LayoutSubmissionForm() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [levelName, setLevelName] = useState('');
  const [description, setDescription] = useState('');
  const [songName, setSongName] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [difficulty, setDifficulty] = useState('EXTREME');
  const [tags, setTags] = useState([]);
  
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTagChange = (tag) => {
    setTags(prevTags => 
      prevTags.includes(tag) 
        ? prevTags.filter(t => t !== tag) 
        : [...prevTags, tag]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    try {
      const response = await axios.post('/api/layouts', {
        levelName,
        description,
        songName,
        videoUrl,
        difficulty,
        gameplayTags: tags // Send the original uppercase values
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      navigate(`/layouts/${response.data.id}`);
      
    } catch (err) {
      setError(err.response?.data?.message || t('layout_submit_failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-8 bg-ui-bg border border-primary-bg rounded-lg space-y-6">
      
      <div>
        <label className="block text-sm font-bold text-text-on-ui/90 mb-2">{t('layout_name_label')}</label>
        <input type="text" value={levelName} onChange={(e) => setLevelName(e.target.value)} required placeholder={t('layout_name_placeholder')} className="w-full p-2 rounded-lg border border-primary-bg bg-primary-bg text-text-primary" />
      </div>

      <div>
        <label className="block text-sm font-bold text-text-on-ui/90 mb-2">{t('description_optional')}</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows="3" placeholder={t('description_placeholder')} className="w-full p-2 rounded-lg border border-primary-bg bg-primary-bg text-text-primary"></textarea>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-bold text-text-on-ui/90 mb-2">{t('song_name_label')}</label>
          <input type="text" value={songName} onChange={(e) => setSongName(e.target.value)} placeholder={t('song_name_placeholder_form')} className="w-full p-2 rounded-lg border border-primary-bg bg-primary-bg text-text-primary" />
        </div>
        <div>
          <label className="block text-sm font-bold text-text-on-ui/90 mb-2">{t('video_url_label')}</label>
          <input type="text" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} required placeholder="https://..." className="w-full p-2 rounded-lg border border-primary-bg bg-primary-bg text-text-primary" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-text-on-ui/90 mb-2">{t('anticipated_difficulty')}</label>
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} required className="w-full p-2 rounded-lg border border-primary-bg bg-primary-bg text-text-primary">
          {demonDifficulties.map(d => <option key={d} value={d}>{t(`difficulty_${d.toLowerCase()}`)}</option>)}
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-bold text-text-on-ui/90 mb-2">{t('gameplay_tags')}</label>
        <div className="flex flex-wrap gap-2">
          {/* [FIX] Map over gameplayTags to use the value, but display the formatted name */}
          {gameplayTags.map(tagValue => (
            <button key={tagValue} type="button" onClick={() => handleTagChange(tagValue)} 
              className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${
                tags.includes(tagValue) 
                  ? 'bg-accent text-text-on-ui'
                  : 'bg-primary-bg text-text-primary hover:bg-primary-bg/80'
              }`}
              disabled={!tags.includes(tagValue) && tags.length >= 3}
            >
              {tagDisplayNames[tagValue] || tagValue}
            </button>
          ))}
        </div>
      </div>
      
      {error && <p className="text-red-400 text-center">{error}</p>}

      <button 
        type="submit" 
        disabled={isSubmitting} 
        className="w-full px-4 py-3 rounded-lg font-semibold bg-accent text-text-on-ui hover:opacity-90 disabled:opacity-70 transition-colors"
      >
        {isSubmitting ? t('submitting') : t('submit_layout')}
      </button>

    </form>
  );
}