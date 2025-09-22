// src/pages/PersonalRecordDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import axios from 'axios';
import { ChevronLeft, Film, Link as LinkIcon } from 'lucide-react';

const getYouTubeVideoId = (urlOrId) => {
  if (!urlOrId || !urlOrId.includes('youtu')) return null; // Only process youtube links
  const urlRegex = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([^?&\n]+)/;
  const urlMatch = urlOrId.match(urlRegex);
  return (urlMatch && urlMatch[1]) ? urlMatch[1] : null;
};

export default function PersonalRecordDetail() {
  const { recordId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecord = async () => {
      if (!token || !recordId) return;
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

  if (loading) {
    return <div className="text-center text-gray-400 p-8">Loading Record...</div>;
  }
  if (!record) {
    return <div className="text-center text-red-500 p-8">Record not found.</div>;
  }
  
  const videoId = getYouTubeVideoId(record.videoUrl);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 text-gray-100">
      <button 
        onClick={() => navigate('/progression')} 
        className="mb-4 inline-flex items-center text-cyan-400 hover:underline"
      >
        <ChevronLeft size={20} /> Back to Progression List
      </button>

      {videoId ? (
        <div className="aspect-w-16 aspect-h-9 mb-6">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}`}
            title="Personal Record Video"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full rounded-lg shadow-lg"
          ></iframe>
        </div>
      ) : (
         <div className="mb-6 bg-gray-800 p-6 rounded-lg shadow-lg text-center">
            <h3 className="text-xl font-bold">Video Preview</h3>
            <p className="text-gray-400 mt-2">A preview is not available for this video link. Click the link below to view.</p>
             <a href={record.videoUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-cyan-400 hover:underline">
                View Video
            </a>
         </div>
      )}

      <div className="bg-gray-800 p-6 rounded-lg shadow-inner space-y-4">
        <div>
          <h1 className="text-4xl font-bold">{record.levelName}</h1>
          <p className="text-lg text-gray-400">{record.difficulty.replace('_', ' ')} Demon</p>
        </div>
        <div className="border-t border-gray-700 pt-4">
          {record.attempts && (
            <p className="text-md"><span className="font-semibold">Attempts:</span> {record.attempts}</p>
          )}
          <div className="flex items-center gap-6 mt-2">
            <a href={record.videoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-300 hover:text-cyan-400 transition-colors">
                <Film className="w-5 h-5" /> Video Proof
            </a>
            {record.rawFootageLink && (
              <a href={record.rawFootageLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-300 hover:text-cyan-400 transition-colors">
                <LinkIcon className="w-5 h-5" /> Raw Footage
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}