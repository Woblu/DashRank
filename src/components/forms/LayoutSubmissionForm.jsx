import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const gameplayTags = [
  'WAVE', 'SHIP', 'TIMING', 'MEMORY', 'STRAIGHT_FLY', 'SPAM', 'DUAL', 
  'UFO', 'BALL', 'ROBOT', 'SPIDER', 'SWING', 'PLATFORMER'
];

const demonDifficulties = ['EASY', 'MEDIUM', 'HARD', 'INSANE', 'EXTREME'];

export default function LayoutSubmissionForm() {
  const { token } = useAuth();
  const navigate = useNavigate();

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
      const newLayout = await axios.post('/api/layouts', 
        { levelName, description, songName, videoUrl, difficulty, tags },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Navigate to a new layout detail page (which we'll create later)
      navigate(`/layouts/${newLayout.data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit layout.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-white bg-gray-800 p-8 rounded-lg border border-gray-700">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-bold text-gray-300 mb-2">Layout Name*</label>
          <input type="text" value={levelName} onChange={(e) => setLevelName(e.target.value)} required className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200" />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-300 mb-2">Song Name</label>
          <input type="text" value={songName} onChange={(e) => setSongName(e.target.value)} className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-300 mb-2">YouTube Video URL*</label>
        <input type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} required placeholder="https://www.youtube.com/watch?v=..." className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200" />
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-300 mb-2">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows="4" className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200" />
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-300 mb-2">Anticipated Difficulty*</label>
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} required className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200">
          {demonDifficulties.map(d => <option key={d} value={d}>{d.charAt(0) + d.slice(1).toLowerCase()}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-300 mb-2">Gameplay Tags (Select up to 3)</label>
        <div className="flex flex-wrap gap-2">
          {gameplayTags.map(tag => (
            <button key={tag} type="button" onClick={() => handleTagChange(tag)} 
              className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${
                tags.includes(tag) ? 'bg-cyan-500 text-white' : 'bg-gray-600 hover:bg-gray-500'
              }`}
              disabled={!tags.includes(tag) && tags.length >= 3}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="text-red-400 text-center">{error}</p>}
      <button type="submit" disabled={isSubmitting} className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-800 text-white font-bold py-3 px-4 rounded-lg">
        {isSubmitting ? 'Submitting...' : 'Submit Layout'}
      </button>
    </form>
  );
}