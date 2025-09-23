import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import axios from 'axios';
import { ChevronLeft, Film, Link as LinkIcon, Pencil, Trash2 } from 'lucide-react';
import { getVideoEmbedUrl } from '../utils/videoUtils.js';

export default function PersonalRecordDetail() {
  const { recordId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecord = async () => {
      if (!token || !recordId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await axios.get(`/api/personal-records/${recordId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRecord(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecord();
  }, [recordId, token]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this personal record?')) {
      return;
    }
    try {
      await axios.delete('/api/personal-records', {
        headers: { Authorization: `Bearer ${token}` },
        data: { recordId: record.id }
      });
      navigate('/progression');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete record.');
    }
  };

  if (loading) {
    return <div className="text-center p-8 text-gray-200">Loading Record...</div>;
  }

  if (!record) {
    return (
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold text-red-500">Record Not Found</h1>
        <button onClick={() => navigate('/progression')} className="mt-4 inline-flex items-center text-cyan-400 hover:underline">
          <ChevronLeft size={16} /> Go Back to Progression List
        </button>
      </div>
    );
  }

  const hostname = window.location.hostname;
  const embedInfo = getVideoEmbedUrl(record.videoUrl, hostname);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 text-gray-900 dark:text-gray-100">
      <div className="relative bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-lg mb-6">
        <button 
          onClick={() => navigate('/progression')} 
          className="absolute top-4 left-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          aria-label="Go back to list"
        >
          <ChevronLeft size={24} />
        </button>
        
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <button
            onClick={() => navigate('/progression', { state: { editRecordId: record.id } })}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors"
            aria-label="Edit Record"
            title="Edit Record"
          >
            <Pencil size={20} />
          </button>
          
          <button
            onClick={handleDelete}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
            aria-label="Delete Record"
            title="Delete Record"
          >
            <Trash2 size={20} />
          </button>
        </div>

        <div className="text-center mb-4 pt-8 sm:pt-0">
          <h1 className="font-poppins text-5xl font-bold text-cyan-600 dark:text-cyan-400 break-words">
            #{record.placement} - {record.levelName}
          </h1>
        </div>
        
        <div className="flex justify-center text-center mb-4 gap-x-8">
          <p className="text-lg text-gray-700 dark:text-gray-300">
            <span className="font-bold">Difficulty:</span> {record.difficulty.charAt(0) + record.difficulty.slice(1).toLowerCase()} Demon
          </p>
          {record.attempts && (
             <p className="text-lg text-gray-700 dark:text-gray-300">
              <span className="font-bold">Attempts:</span> {record.attempts}
            </p>
          )}
        </div>

        <div className="aspect-video w-full bg-black rounded-xl">
          {embedInfo ? (
            embedInfo.type === 'iframe' ? (
              <iframe
                width="100%" height="100%"
                src={embedInfo.url}
                title="Record Video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="rounded-xl shadow-lg"
              ></iframe>
            ) : (
              <video
                width="100%" height="100%"
                controls
                src={embedInfo.url}
                className="rounded-xl shadow-lg"
              >
                Your browser does not support the video tag.
              </video>
            )
          ) : (
             <div className="w-full h-full rounded-xl shadow-lg bg-gray-900 flex flex-col items-center justify-center">
                <p className="text-gray-300">Video preview not available.</p>
                <a href={record.videoUrl} target="_blank" rel="noopener noreferrer" className="mt-2 text-cyan-400 hover:underline">
                    View Original Video Link
                </a>
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-inner">
        <h2 className="text-2xl font-bold text-center text-cyan-600 dark:text-cyan-400 mb-4">Record Details</h2>
        <div className="flex items-center justify-center gap-6 mt-2">
            <a href={record.videoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-cyan-400 transition-colors">
                <Film className="w-5 h-5" /> Video Proof
            </a>
        </div>
      </div>
    </div>
  );
}