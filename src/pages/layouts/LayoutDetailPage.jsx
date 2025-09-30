import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, Music, User, Tag, BarChartHorizontal } from 'lucide-react';
import { getVideoEmbedUrl } from '../../utils/videoUtils.js';

const difficultyColors = {
  EASY: 'text-green-400',
  MEDIUM: 'text-yellow-400',
  HARD: 'text-orange-400',
  INSANE: 'text-red-400',
  EXTREME: 'text-purple-400',
};

export default function LayoutDetailPage() {
  const { layoutId } = useParams();
  const [layout, setLayout] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLayout = async () => {
      setIsLoading(true);
      try {
        // This endpoint will not work until we migrate the 'layouts/:id' logic
        // into our new monolithic API router.
        const res = await axios.get(`/api/layouts/${layoutId}`);
        setLayout(res.data);
      } catch (err) {
        setError('Failed to load layout details.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLayout();
  }, [layoutId]);

  if (isLoading) return <p className="text-center text-gray-400 animate-pulse">Loading Layout...</p>;
  if (error) return <p className="text-center text-red-500">{error}</p>;
  if (!layout) return null;

  const embedInfo = getVideoEmbedUrl(layout.videoUrl, window.location.hostname);

  return (
    <div className="max-w-5xl mx-auto text-white">
      <div className="mb-6">
        <Link to="/layouts" className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors">
          <ChevronLeft size={20} />
          Back to Layout Gallery
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          
          {/* --- This section has been moved above the video --- */}
          <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 mb-4">
             <h1 className="text-4xl font-bold mb-2">{layout.levelName}</h1>
             <p className="text-gray-400">{layout.description || "No description provided."}</p>
          </div>

          <div className="aspect-video w-full bg-black rounded-xl">
            {embedInfo ? (
              <iframe
                width="100%" height="100%"
                src={embedInfo.url}
                title="Layout Video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="rounded-xl shadow-lg"
              ></iframe>
            ) : <div className="w-full h-full rounded-xl bg-gray-900 flex items-center justify-center"><p>Video preview not available.</p></div>}
          </div>

        </div>
        
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
            <h2 className="text-xl font-bold mb-4 border-b border-gray-700 pb-2">Details</h2>
            <div className="space-y-3 text-gray-300">
              <p className="flex items-center gap-2"><User size={16} className="text-cyan-400"/> <strong>Creator:</strong> {layout.creator.username}</p>
              <p className="flex items-center gap-2"><Music size={16} className="text-cyan-400"/> <strong>Song:</strong> {layout.songName || 'N/A'}</p>
              <p className="flex items-center gap-2"><BarChartHorizontal size={16} className="text-cyan-400"/> <strong className={difficultyColors[layout.difficulty]}>Difficulty:</strong> {layout.difficulty}</p>
            </div>
          </div>
          <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Tag/> Tags</h2>
            <div className="flex flex-wrap gap-2">
              {layout.tags.length > 0 ? layout.tags.map(tag => (
                <span key={tag} className="text-sm bg-gray-700 text-gray-300 px-3 py-1 rounded-full">{tag}</span>
              )) : <p className="text-sm text-gray-500">No tags provided.</p>}
            </div>
          </div>
          <button className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-cyan-500/20">
            Request to Decorate (Coming Soon)
          </button>
        </div>
      </div>
    </div>
  );
}