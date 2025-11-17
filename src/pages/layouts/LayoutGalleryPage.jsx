// src/pages/layouts/LayoutGalleryPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import LayoutCard from '../../components/LayoutCard';
import { PlusCircle, Filter, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

// [FIX] Use this array for the filter values
const gameplayTags = [
  'WAVE', 'SHIP', 'TIMING', 'MEMORY', 'STRAIGHT_FLY', 'SPAM', 'DUAL',
  'UFO', 'BALL', 'ROBOT', 'SPIDER', 'SWING', 'PLATFORMER'
];

// [FIX] Use this map for the display names
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

export default function LayoutGalleryPage() {
  const [layouts, setLayouts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const { t } = useLanguage();

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    difficulty: 'ALL',
    tag: 'ALL',
    song: '',
  });

  useEffect(() => {
    const fetchLayouts = async () => {
      setIsLoading(true);
      try {
        const res = await axios.get('/api/layouts');
        setLayouts(res.data);
      } catch (err) {
        setError('Failed to fetch layouts.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchLayouts();
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({ difficulty: 'ALL', tag: 'ALL', song: '' });
  };

  const filteredLayouts = useMemo(() => {
    return layouts.filter(layout => {
      const { difficulty, tag, song } = filters;
      if (difficulty !== 'ALL' && layout.difficulty !== difficulty) return false;
      if (tag !== 'ALL' && (!layout.gameplayTags || !layout.gameplayTags.includes(tag))) return false;
      if (song && (!layout.songName || !layout.songName.toLowerCase().includes(song.toLowerCase()))) {
        return false;
      }
      return true;
    });
  }, [layouts, filters]);

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold text-accent">{t('creators_workshop')}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold bg-ui-bg text-text-on-ui hover:bg-primary-bg transition-colors"
          >
            <Filter size={18} /> {t('filters')}
          </button>
          {user && (
            <Link
              to="/layouts/new"
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold bg-accent text-text-on-ui hover:opacity-90 transition-colors"
            >
              <PlusCircle size={18} /> {t('create_new_layout')}
            </Link>
          )}
        </div>
      </div>
      
      {/* Filter Panel */}
      {isFilterOpen && (
        <div className="p-4 bg-ui-bg rounded-lg border border-primary-bg mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Difficulty Filter */}
            <div>
              <label className="block text-sm font-bold text-text-muted mb-1">{t('difficulty')}</label>
              <select name="difficulty" value={filters.difficulty} onChange={handleFilterChange} className="w-full p-2 rounded-lg border border-primary-bg bg-primary-bg text-text-primary">
                <option value="ALL">{t('all')}</option>
                {demonDifficulties.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            {/* Tag Filter */}
            <div>
              <label className="block text-sm font-bold text-text-muted mb-1">{t('tag')}</label>
              <select name="tag" value={filters.tag} onChange={handleFilterChange} className="w-full p-2 rounded-lg border border-primary-bg bg-primary-bg text-text-primary">
                <option value="ALL">{t('all')}</option>
                {/* [FIX] Map over gameplayTags to use the value, but display the name from tagDisplayNames */}
                {gameplayTags.map(tagValue => (
                  <option key={tagValue} value={tagValue}>
                    {tagDisplayNames[tagValue] || tagValue}
                  </option>
                ))}
              </select>
            </div>
            {/* Song Filter */}
            <div>
              <label className="block text-sm font-bold text-text-muted mb-1">{t('song_name')}</label>
              <input name="song" type="text" value={filters.song} onChange={handleFilterChange} placeholder={t('song_name_placeholder')} className="w-full p-2 rounded-lg border border-primary-bg bg-primary-bg text-text-primary" />
            </div>
            {/* Reset Button */}
            <div className="flex items-end">
              <button onClick={resetFilters} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold bg-red-600/80 hover:bg-red-700/80 text-white transition-colors">
                <X size={18} /> {t('reset')}
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-center text-text-muted animate-pulse">{t('loading_layouts')}</p>
      ) : error ? (
        <p className="text-center text-red-500">{error}</p>
      ) : (
        <div className="flex flex-col gap-6">
          {filteredLayouts.length > 0 ? (
            filteredLayouts.map(layout => <LayoutCard key={layout.id} layout={layout} />)
          ) : (
            <div className="text-center text-text-muted border-2 border-dashed border-primary-bg p-10 rounded-lg">
              <p className="text-lg font-bold">{t('no_layouts_found')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}