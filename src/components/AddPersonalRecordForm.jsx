import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext.jsx';
import { PlusCircle, Save, X } from 'lucide-react';

export default function AddPersonalRecordForm({ onClose, onRecordAdded, recordCount, existingRecord }) {
  const { token } = useAuth();
  
  // Determine if we are in "edit mode"
  const isEditMode = Boolean(existingRecord);

  const [placement, setPlacement] = useState(recordCount + 1);
  const [levelName, setLevelName] = useState('');
  const [difficulty, setDifficulty] = useState('EXTREME');
  const [attempts, setAttempts] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If in edit mode, populate the form with existing data
  useEffect(() => {
    if (isEditMode) {
      setPlacement(existingRecord.placement);
      setLevelName(existingRecord.levelName);
      setDifficulty(existingRecord.difficulty);
      setAttempts(existingRecord.attempts || '');
      setVideoUrl(existingRecord.videoUrl);
      setThumbnailUrl(existingRecord.thumbnailUrl || '');
    }
  }, [existingRecord, isEditMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const recordData = { placement, levelName, difficulty, attempts, videoUrl, thumbnailUrl };

    try {
      if (isEditMode) {
        // If editing, send a PUT request to the specific record's endpoint
        await axios.put(`/api/personal-records/${existingRecord.id}`, recordData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        // If creating, send a POST request
        await axios.post('/api/personal-records', recordData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      onRecordAdded(); // Tell the parent page to refresh its data
      onClose(); // Close the modal
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <header className="relative p-4 border-b border-gray-700 flex justify-end items-center">
          <h2 className="absolute left-1/2 -translate-x-1/2 text-xl font-bold text-gray-100">
            {isEditMode ? 'Edit Record' : 'Add to Progression List'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-600 z-10">
            <X className="w-6 h-6 text-gray-300" />
          </button>
        </header>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">Placement</label>
            <input type="number" value={placement} onChange={(e) => setPlacement(e.target.value)} required min="1" disabled={isSubmitting} className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200" />
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
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
              <option value="INSANE">Insane</option>
              <option value="EXTREME">Extreme</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-300 mb-2">Video Proof (YouTube, Twitch, Google Drive, Medal)</label>
            <input type="text" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} required placeholder="https://..." disabled={isSubmitting} className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-300 mb-2">Thumbnail URL (Optional)</label>
            <p className="text-xs text-gray-500 mb-2">For non-YouTube videos, paste an image link (e.g., from Imgur).</p>
            <input 
              type="text" 
              value={thumbnailUrl} 
              onChange={(e) => setThumbnailUrl(e.target.value)} 
              placeholder="https://i.imgur.com/..." 
              disabled={isSubmitting} 
              className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200" 
            />
          </div>
          
          {error && <p className="md:col-span-2 text-red-400 text-center">{error}</p>}
          
          <button type="submit" disabled={isSubmitting} className="md:col-span-2 w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-800 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg">
            {isEditMode ? <><Save className="w-5 h-5" /> Update Record</> : <><PlusCircle className="w-5 h-5" /> Add Record</>}
          </button>
        </form>
      </div>
    </div>
  );
}