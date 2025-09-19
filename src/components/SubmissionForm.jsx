// src/components/SubmissionForm.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function SubmissionForm() {
  const { user, token } = useAuth();
  
  // New state for the player's name, initialized to the logged-in user
  const [playerName, setPlayerName] = useState(user.username);
  
  const [levelName, setLevelName] = useState('');
  const [percent, setPercent] = useState(100);
  const [videoId, setVideoId] = useState('');
  const [rawFootageLink, setRawFootageLink] = useState('');
  const [notes, setNotes] =useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Keep the playerName state in sync if the user object changes
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
        levelName,
        player: playerName, // Send the potentially edited player name
        percent: Number(percent),
        videoId,
        rawFootageLink,
        notes,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess(response.data.message);
      // Clear form on success
      setLevelName('');
      setPercent(100);
      setVideoId('');
      setRawFootageLink('');
      setNotes('');
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-md text-center">{error}</div>}
      {success && <div className="bg-green-500/20 border border-green-500 text-green-300 px-4 py-3 rounded-md text-center">{success}</div>}

      <div>
        <label htmlFor="levelName" className="block text-lg font-bold text-gray-200 mb-1">Demon</label>
        <p className="text-sm text-gray-400 mb-2">The level this record was achieved on. Only demons currently on the list are accepted.</p>
        <input type="text" id="levelName" value={levelName} onChange={(e) => setLevelName(e.target.value)} required disabled={isSubmitting} className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
      </div>

      <div>
        <label htmlFor="player" className="block text-lg font-bold text-gray-200 mb-1">Holder</label>
        <p className="text-sm text-gray-400 mb-2">The player who achieved the record. This defaults to your username.</p>
        <input 
          type="text" 
          id="player" 
          value={playerName} 
          onChange={(e) => setPlayerName(e.target.value)}
          disabled={user.role !== 'ADMIN' && user.role !== 'MODERATOR'} // The main logic is here
          className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:bg-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed" 
        />
      </div>

      <div>
        <label htmlFor="percent" className="block text-lg font-bold text-gray-200 mb-1">Progress</label>
        <p className="text-sm text-gray-400 mb-2">Your percentage must be greater than or equal to the demon's minimum requirement.</p>
        <input type="number" id="percent" value={percent} onChange={(e) => setPercent(e.target.value)} required min="1" max="100" disabled={isSubmitting} className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
      </div>

      <div>
        <label htmlFor="videoId" className="block text-lg font-bold text-gray-200 mb-1">Video Proof</label>
        <p className="text-sm text-gray-400 mb-2">A link to a YouTube or Twitch video proving the record's legitimacy.</p>
        <input type="text" id="videoId" value={videoId} onChange={(e) => setVideoId(e.target.value)} required disabled={isSubmitting} className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
      </div>
      
      <div>
        <label htmlFor="rawFootageLink" className="block text-lg font-bold text-gray-200 mb-1">Raw Footage (Required)</label>
        <p className="text-sm text-gray-400 mb-2">A link to the unedited footage, uploaded to a service like Google Drive or Dropbox. This is required for all submissions.</p>
        <input type="text" id="rawFootageLink" value={rawFootageLink} onChange={(e) => setRawFootageLink(e.target.value)} required disabled={isSubmitting} className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
      </div>

      <div>
        <label htmlFor="notes" className="block text-lg font-bold text-gray-200 mb-1">Notes</label>
        <p className="text-sm text-gray-400 mb-2">Any additional comments for the list moderators.</p>
        <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows="3" disabled={isSubmitting} className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"></textarea>
      </div>
      
      <p className="text-xs text-gray-500 text-center">By submitting you acknowledge the submission guidelines.</p>
      
      <button type="submit" disabled={isSubmitting} className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-800 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors">
        <Send className="w-5 h-5" /> {isSubmitting ? 'Submitting...' : 'Submit for Review'}
      </button>
    </form>
  );
}