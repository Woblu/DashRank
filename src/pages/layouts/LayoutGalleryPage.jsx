import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import LayoutCard from '../../components/LayoutCard';
import { PlusCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function LayoutGalleryPage() {
  const [layouts, setLayouts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    const fetchLayouts = async () => {
      setIsLoading(true);
      try {
        const res = await axios.get('/api/layouts');
        setLayouts(res.data);
      } catch (err) {
        setError('Failed to load layouts. Please try again later.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLayouts();
  }, []);

  return (
    <div className="max-w-7xl mx-auto text-white">
      <div className="text-center border-b-2 border-dotted border-gray-700 pb-8 mb-8">
        <h1 className="text-5xl md:text-6xl font-bold text-white drop-shadow-[0_0_15px_rgba(8,145,178,0.5)]">
          Creator's Workshop
        </h1>
        <p className="text-gray-400 mt-4 max-w-2xl mx-auto">
          Browse unfinished layouts from the community. Find a project to decorate, or share your own work to find collaborators.
        </p>
        {user && (
          <Link 
            to="/layouts/new" 
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold bg-cyan-600 hover:bg-cyan-700 text-white transition-colors shadow-lg shadow-cyan-500/20"
          >
            <PlusCircle /> Submit Your Layout
          </Link>
        )}
      </div>

      {isLoading ? (
        <p className="text-center text-gray-400 animate-pulse">Loading Layouts...</p>
      ) : error ? (
        <p className="text-center text-red-500">{error}</p>
      ) : (
        // This div has been changed from a flex column to a grid
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {layouts.length > 0 ? (
            layouts.map(layout => <LayoutCard key={layout.id} layout={layout} />)
          ) : (
            <div className="text-center text-gray-500 border-2 border-dashed border-gray-700 p-10 rounded-lg col-span-full">
              <p>No layouts have been submitted yet. Be the first!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}