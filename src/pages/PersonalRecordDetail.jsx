// src/pages/PersonalRecordDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import axios from 'axios';
import { ChevronLeft } from 'lucide-react';

const getYouTubeVideoId = (urlOrId) => {
  if (!urlOrId || !urlOrId.includes('youtu')) return null;
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

  const youtubeVideoId = getYouTubeVideoId(record.videoUrl);
  const isMp4 = record.videoUrl.endsWith('.mp4');

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 text-gray-900 dark:text-gray-100">
      <div className="relative bg-gray-100 dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-lg mb-6">
        <button 
          onClick={() => navigate('/progression')} 
          className="absolute top-4 left-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100 hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
          aria-label="Go back to list"
        >
          <ChevronLeft size={24} />
        </button>

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

        {record.rawFootageLink && (
            <div className="text-center mb-6">
                <a href={record.rawFootageLink} target="_blank" rel="noopener noreferrer" className="text-cyan-600 dark:text-cyan-400 hover:underline font-semibold">
                    View Raw Footage
                </a>
            </div>
        )}

        <div className="aspect-video w-full">
          {youtubeVideoId ? (
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="rounded-xl shadow-lg"
            ></iframe>
          ) : isMp4 ? (
            <video
                width="100%"
                height="100%"
                controls
                src={record.videoUrl}
                className="rounded-xl shadow-lg"
            >
                Your browser does not support the video tag.
            </video>
          ) : (
             <div className="w-full h-full rounded-xl shadow-lg bg-gray-900 flex flex-col items-center justify-center">
                <p className="text-gray-300">Video preview not available.</p>
                <a href={record.videoUrl} target="_blank" rel="noopener noreferrer" className="mt-2 text-cyan-400 hover:underline">
                    View Video Link
                </a>
            </div>
          )}
        </div>
      </div>
      
      {/* Records section is intentionally omitted as requested */}
    </div>
  );
}