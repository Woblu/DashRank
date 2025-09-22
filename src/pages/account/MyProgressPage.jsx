// src/pages/account/MyProgressPage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { PlusCircle, Trash2, Film, Link as LinkIcon } from 'lucide-react';

export default function MyProgressPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();
  
  // Form State
  const [placement, setPlacement] = useState(1);
  const [levelName, setLevelName] = useState('');
  const [difficulty, setDifficulty] = useState('EXTREME');
  const [attempts, setAttempts] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [rawFootageLink, setRawFootageLink] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const apiEndpoint = '/api/personal-records';

  const fetchRecords = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await axios.get(apiEndpoint, { headers: { Authorization: `Bearer ${token}` } });
      setRecords(res.data);
      setPlacement(res.data.length + 1); // Default placement for new record
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);
    try {
      await axios.post(apiEndpoint,
        { placement, levelName, difficulty, attempts, videoUrl, rawFootageLink, thumbnailUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('Record added successfully!');
      // Clear form and refresh list
      setLevelName(''); setDifficulty('EXTREME'); setAttempts('');
      setVideoUrl(''); setRawFootageLink(''); setThumbnailUrl('');
      fetchRecords();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (recordId) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      await axios.delete(apiEndpoint, {
        headers: { Authorization: `Bearer ${token}` },
        data: { recordId }
      });
      fetchRecords();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete record.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-gray-800 border border-gray-700 rounded-lg">
        <header className="p-4 border-b border-gray-700"><h2 className="text-2xl font-bold">Add New Completion</h2></header>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">Placement</label>
            <input type="number" value={placement} onChange={(e) => setPlacement(e.target.value)} required min="1" max={records.length + 1} disabled={isSubmitting} className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">Attempts (Optional)</label>
            <input type="number" value={attempts} onChange={(e) => setAttempts(e.target.value)} min="1" disabled={isSubmitting} className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-300 mb-2">Level Name</label>
            <input type="text" value={levelName} onChange={(e) => setLevelName(e.target.value)} required disabled={isSubmitting} className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-300 mb-2">Demon Difficulty</label>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} required disabled={isSubmitting} className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200">
              <option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option><option value="INSANE">Insane</option><option value="EXTREME">Extreme</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-300 mb-2">Video Proof (YouTube, etc.)</label>
            <input type="text" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} required placeholder="https://..." disabled={isSubmitting} className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-300 mb-2">Raw Footage Link (Optional)</label>
            <input type="text" value={rawFootageLink} onChange={(e) => setRawFootageLink(e.target.value)} placeholder="https://drive.google.com/..." disabled={isSubmitting} className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-300 mb-2">Thumbnail URL (Optional)</label>
            <p className="text-xs text-gray-500 mb-2">For non-YouTube videos, paste a direct link to an image (e.g., from Imgur).</p>
            <input type="text" value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="https://i.imgur.com/..." disabled={isSubmitting} className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200" />
          </div>
          {error && <p className="md:col-span-2 text-red-400 text-center">{error}</p>}
          <button type="submit" disabled={isSubmitting} className="md:col-span-2 w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-800 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg">
            <PlusCircle className="w-5 h-5" /> Add Record
          </button>
        </form>
      </div>
      <div className="bg-gray-800 border border-gray-700 rounded-lg">
        <header className="p-4 border-b border-gray-700"><h2 className="text-2xl font-bold">My Completed Demons</h2></header>
        <div className="p-6 space-y-3">
          {loading ? <p className="text-center text-gray-400">Loading records...</p> : records.length > 0 ? records.map(record => (
            <div key={record.id} className="flex justify-between items-center bg-gray-900 p-3 rounded-lg">
              <div className="flex-grow">
                <p className="font-bold text-lg text-cyan-400">#{record.placement} - {record.levelName}</p>
                <p className="text-sm text-gray-400">{record.difficulty.replace('_', ' ')} Demon {record.attempts ? `- ${record.attempts} attempts` : ''}</p>
                <div className="flex items-center gap-4 mt-2 text-xs">
                  <a href={record.videoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-gray-300 hover:text-cyan-400 transition-colors"><Film className="w-4 h-4" /> Video Proof</a>
                  {record.rawFootageLink && (<a href={record.rawFootageLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-gray-300 hover:text-cyan-400 transition-colors"><LinkIcon className="w-4 h-4" /> Raw Footage</a>)}
                </div>
              </div>
              <button onClick={() => handleDelete(record.id)} className="p-2 ml-2 text-red-500 hover:bg-red-500/20 rounded-full transition-colors"><Trash2 className="w-5 h-5" /></button>
            </div>
          )) : <p className="text-gray-400 text-center">You haven't added any personal records yet.</p>}
        </div>
      </div>
    </div>
  );
}