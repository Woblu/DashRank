import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext'; // 1. Import

const gameplayTags = [
  'WAVE', 'SHIP', 'TIMING', 'MEMORY', 'STRAIGHT_FLY', 'SPAM', 'DUAL', 
  'UFO', 'BALL', 'ROBOT', 'SPIDER', 'SWING', 'PLATFORMER'
];

const demonDifficulties = ['EASY', 'MEDIUM', 'HARD', 'INSANE', 'EXTREME'];

export default function LayoutSubmissionForm() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage(); // 2. Initialize

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
        gameplayTags: tags
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Navigate to the new layout's detail page
      navigate(`/layouts/${response.data.id}`);
      
    } catch (err) {
      setError(err.response?.data?.message || t('layout_submit_failed')); // Translated
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-8 bg-ui-bg border border-primary-bg rounded-lg space-y-6"> {/* THEMED */}
      
      <div>
        <label className="block text-sm font-bold text-text-on-ui/90 mb-2">{t('layout_name_label')}</label> {/* THEMED */}
        <input type="text" value={levelName} onChange={(e) => setLevelName(e.target.value)} required placeholder={t('layout_name_placeholder')} className="w-full p-2 rounded-lg border border-primary-bg bg-primary-bg text-text-primary" /> {/* THEMED */}
      </div>

      <div>
        <label className="block text-sm font-bold text-text-on-ui/90 mb-2">{t('description_optional')}</label> {/* THEMED */}
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows="3" placeholder={t('description_placeholder')} className="w-full p-2 rounded-lg border border-primary-bg bg-primary-bg text-text-primary"></textarea> {/* THEMED */}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-bold text-text-on-ui/90 mb-2">{t('song_name_label')}</label> {/* THEMED */}
          <input type="text" value={songName} onChange={(e) => setSongName(e.target.value)} placeholder={t('song_name_placeholder_form')} className="w-full p-2 rounded-lg border border-primary-bg bg-primary-bg text-text-primary" /> {/* THEMED */}
        </div>
        <div>
          <label className="block text-sm font-bold text-text-on-ui/90 mb-2">{t('video_url_label')}</label> {/* THEMED */}
          <input type="text" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} required placeholder="https://..." className="w-full p-2 rounded-lg border border-primary-bg bg-primary-bg text-text-primary" /> {/* THEMED */}
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-text-on-ui/90 mb-2">{t('anticipated_difficulty')}</label> {/* THEMED */}
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} required className="w-full p-2 rounded-lg border border-primary-bg bg-primary-bg text-text-primary"> {/* THEMED */}
          {demonDifficulties.map(d => <option key={d} value={d}>{t(`difficulty_${d.toLowerCase()}`)}</option>)}
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-bold text-text-on-ui/90 mb-2">{t('gameplay_tags')}</label> {/* THEMED */}
        <div className="flex flex-wrap gap-2">
          {gameplayTags.map(tag => (
            <button key={tag} type="button" onClick={() => handleTagChange(tag)} 
              className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${
                tags.includes(tag) 
                  ? 'bg-accent text-text-on-ui' // THEMED
                  : 'bg-primary-bg text-text-primary hover:bg-primary-bg/80' // THEMED
              }`}
              disabled={!tags.includes(tag) && tags.length >= 3}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
      
      {error && <p className="text-red-400 text-center">{error}</p>}

      <button 
        type="submit" 
        disabled={isSubmitting} 
        className="w-full px-4 py-3 rounded-lg font-semibold bg-accent text-text-on-ui hover:opacity-90 disabled:opacity-70 transition-colors" /* THEMED */
      >
        {isSubmitting ? t('submitting') : t('submit_layout')}
      </button>

    </form>
  );
}