// src/pages/SearchResults.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import LevelCard from '../components/LevelCard';
import LoadingSpinner from '../components/LoadingSpinner';

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q');
  
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!query) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const fetchResults = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await axios.get(`/api/search?q=${query}`);
        setResults(response.data);
      } catch (err) {
        setError('Failed to load search results.');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center pt-6 px-4">
      <h1 className="font-poppins text-4xl font-bold text-center text-cyan-400 mb-6 break-words">
        Search Results for: <span className="text-white">"{query}"</span>
      </h1>

      <div className="flex flex-col gap-4 w-full max-w-3xl">
        {error && <p className="text-center text-red-500 mt-8">{error}</p>}
        {!error && results.length > 0 ? (
          results.map((level, index) => (
            <LevelCard
              key={level.id}
              level={level}
              index={index}
              listType={level.list}
            />
          ))
        ) : (
          !error && <p className="text-center text-gray-400 mt-8">No levels found.</p>
        )}
      </div>
    </div>
  );
}