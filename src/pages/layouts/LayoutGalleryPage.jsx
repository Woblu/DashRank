import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import LayoutCard from '../../components/LayoutCard';
import { PlusCircle, Filter, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

// Constants for filter dropdowns, derived from your schema
const demonDifficulties = ['EASY', 'MEDIUM', 'HARD', 'INSANE', 'EXTREME'];
const gameplayTags = [
  'WAVE', 'SHIP', 'TIMING', 'MEMORY', 'STRAIGHT_FLY', 'SPAM', 'DUAL', 
  'UFO', 'BALL', 'ROBOT', 'SPIDER', 'SWING', 'PLATFORMER'
];

export default function LayoutGalleryPage() {
  const [layouts, setLayouts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  // State for the filter functionality
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
        setError('Failed to load layouts. Please try again later.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLayouts();
  }, []);

  // Filter logic
  const filteredLayouts = useMemo(() => {
    return layouts.filter(layout => {
      const difficultyMatch = filters.difficulty === 'ALL' || layout.difficulty === filters.difficulty;
      const tagMatch = filters.tag === 'ALL' || layout.tags.includes(filters.tag);
      const songMatch = !filters.song || layout.songName?.toLowerCase().includes(filters.song.toLowerCase());
      return difficultyMatch && tagMatch && songMatch;
    });
  }, [layouts, filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };
  
  const resetFilters = () => {
    setFilters({ difficulty: 'ALL', tag: 'ALL', song: '' });
    setIsFilterOpen(false);
  };


  return (
    <div className="max-w-7xl mx-auto text-white">
      <div className="text-center border-b-2 border-dotted border-gray-700 pb-8 mb-8">
        <h1 className="text-5xl md:text-6xl font-bold text-white drop-shadow-[0_0_15px_rgba(8,145,178,0.5)]">
          Creator's Workshop
        </h1>
        <p className="text-gray-400 mt-4 max-w-2xl mx-auto">
          Browse unfinished layouts from the community. Find a project to decorate, or share your own work to find collaborators.
        </p>
        {user && (
          <Link 
            to="/layouts/new" 
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold bg-cyan-600 hover:bg-cyan-700 text-white transition-colors shadow-lg shadow-cyan-500/20"
          >
            <PlusCircle /> Submit Your Layout
          </Link>
        )}
      </div>

      {/* Filter Controls */}
      <div className="mb-6">
        <button onClick={() => setIsFilterOpen(!isFilterOpen)} className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-gray-700 hover:bg-gray-600 text-white transition-colors">
          <Filter size={18} /> {isFilterOpen ? 'Close Filters' : 'Open Filters'}
        </button>
        {isFilterOpen && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 bg-gray-800/50 p-4 rounded-lg border border-gray-700">
            {/* Difficulty Filter */}
            <div>
              <label className="block text-sm font-bold text-gray-400 mb-1">Difficulty</label>
              <select name="difficulty" value={filters.difficulty} onChange={handleFilterChange} className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200">
                <option value="ALL">All Difficulties</option>
                {demonDifficulties.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            {/* Tag Filter */}
            <div>
              <label className="block text-sm font-bold text-gray-400 mb-1">Tag</label>
              <select name="tag" value={filters.tag} onChange={handleFilterChange} className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200">
                <option value="ALL">All Tags</option>
                {gameplayTags.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {/* Song Filter */}
            <div>
              <label className="block text-sm font-bold text-gray-400 mb-1">Song Name</label>
              <input name="song" type="text" value={filters.song} onChange={handleFilterChange} placeholder="Enter song name..." className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200" />
            </div>
            {/* Reset Button */}
            <div className="flex items-end">
              <button onClick={resetFilters} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold bg-red-600/80 hover:bg-red-700/80 text-white transition-colors">
                <X size={18} /> Reset
              </button>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <p className="text-center text-gray-400 animate-pulse">Loading Layouts...</p>
      ) : error ? (
        <p className="text-center text-red-500">{error}</p>
      ) : (
        // Layout has been reverted to a single vertical column
        <div className="flex flex-col gap-6">
          {filteredLayouts.length > 0 ? (
            filteredLayouts.map(layout => <LayoutCard key={layout.id} layout={layout} />)
          ) : (
            <div className="text-center text-gray-500 border-2 border-dashed border-gray-700 p-10 rounded-lg col-span-full">
              <p>No layouts match the current filters. Try resetting them!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}