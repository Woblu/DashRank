// src/pages/account/MyProgressPage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { PlusCircle, Trash2 } from 'lucide-react';

export default function MyProgressPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [levelName, setLevelName] = useState('');
  const [difficulty, setDifficulty] = useState('EXTREME');
  const [attempts, setAttempts] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [error, setError] = useState('');
  const { token } = useAuth();

  const apiEndpoint = '/api/personal-records'; // Use a single endpoint

  const fetchRecords = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await axios.get(apiEndpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecords(res.data);
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
    try {
      await axios.post(apiEndpoint,
        { levelName, difficulty, attempts, videoUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setLevelName(''); setDifficulty('EXTREME'); setAttempts(''); setVideoUrl('');
      fetchRecords();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add record.');
    }
  };

  const handleDelete = async (recordId) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      await axios.delete(apiEndpoint, {
        headers: { Authorization: `Bearer ${token}` },
        data: { recordId } // For DELETE requests, the body is in the 'data' property
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">Level Name</label>
              <input type="text" value={levelName} onChange={(e) => setLevelName(e.target.value)} required className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">Demon Difficulty</label>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} required className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200">
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
                <option value="INSANE">Insane</option>
                <option value="EXTREME">Extreme</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">YouTube Video URL</label>
              <input type="text" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} required className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">Attempts (Optional)</label>
              <input type="number" value={attempts} onChange={(e) => setAttempts(e.target.value)} min="1" className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200" />
            </div>
          </div>
          {error && <p className="text-red-400 text-center">{error}</p>}
          <button type="submit" className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-lg">
            <PlusCircle className="w-5 h-5" /> Add Record
          </button>
        </form>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg">
        <header className="p-4 border-b border-gray-700"><h2 className="text-2xl font-bold">My Completed Demons</h2></header>
        <div className="p-6 space-y-3">
          {loading ? <p>Loading records...</p> : records.length > 0 ? records.map(record => (
            <div key={record.id} className="flex justify-between items-center bg-gray-900 p-3 rounded">
              <div>
                <a href={record.videoUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-lg text-cyan-400 hover:underline">{record.levelName}</a>
                <p className="text-sm text-gray-400">{record.difficulty.replace('_', ' ')} Demon {record.attempts ? `- ${record.attempts} attempts` : ''}</p>
              </div>
              <button onClick={() => handleDelete(record.id)} className="p-2 text-red-500 hover:bg-red-500/20 rounded-full">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          )) : <p className="text-gray-400">You haven't added any personal records yet.</p>}
        </div>
      </div>
    </div>
  );
}