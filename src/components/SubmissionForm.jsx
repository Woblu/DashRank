// src/components/SubmissionForm.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function SubmissionForm() {
  const { user, token } = useAuth();
  const [levelName, setLevelName] = useState('');
  const [percent, setPercent] = useState(100);
  const [videoId, setVideoId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const response = await axios.post('/api/submissions/create', {
        levelName,
        player: user.username,
        percent: Number(percent),
        videoId,
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setSuccess(response.data.message);
      setLevelName('');
      setPercent(100);
      setVideoId('');
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-md text-center">{error}</div>}
      {success && <div className="bg-green-500/20 border border-green-500 text-green-300 px-4 py-3 rounded-md text-center">{success}</div>}
      
      <div>
        <label htmlFor="levelName" className="block text-sm font-bold text-gray-300 mb-2">Level Name</label>
        <input type="text" id="levelName" value={levelName} onChange={(e) => setLevelName(e.target.value)} required disabled={isSubmitting} className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
      </div>
      <div>
        <label htmlFor="percent" className="block text-sm font-bold text-gray-300 mb-2">Percentage</label>
        <input type="number" id="percent" value={percent} onChange={(e) => setPercent(e.target.value)} required min="1" max="100" disabled={isSubmitting} className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
      </div>
      <div>
        <label htmlFor="videoId" className="block text-sm font-bold text-gray-300 mb-2">YouTube Video URL or ID</label>
        <input type="text" id="videoId" value={videoId} onChange={(e) => setVideoId(e.target.value)} required disabled={isSubmitting} className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
      </div>
      
      <button type="submit" disabled={isSubmitting} className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-800 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors">
        <Send className="w-5 h-5" /> {isSubmitting ? 'Submitting...' : 'Submit Record'}
      </button>
    </form>
  );
}