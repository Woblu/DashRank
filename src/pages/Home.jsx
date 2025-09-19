import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import LevelCard from "../components/LevelCard";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import axios from 'axios';
import LoadingSpinner from "../components/LoadingSpinner"; // Added spinner import

const listTitles = {
  main: "Main List",
  unrated: "Unrated List",
  platformer: "Platformer List",
  speedhack: "Speedhack List",
  future: "Future List",
  challenge: "Challenge List",
};

export default function Home() {
  const { listType } = useParams();
  const { t } = useLanguage();
  const currentListType = listType || "main";
  
  const [levels, setLevels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchLevels = async () => {
      setIsLoading(true);
      setError(null);
      setSearch("");
      try {
        const response = await axios.get(`/api/lists/${currentListType}`);
        setLevels(response.data);
      } catch (err) {
        console.error("Failed to fetch levels:", err);
        setError(`Failed to load '${listTitles[currentListType]}'. Please try again later.`);
        setLevels([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLevels();
    // No window.scrollTo(0,0) here to allow scrolling down the page and switching lists
    // without the page jumping to the top.
  }, [currentListType]);

  const filteredLevels = levels.filter(
    (level) =>
      level.name.toLowerCase().includes(search.toLowerCase()) ||
      (level.creator && level.creator.toLowerCase().includes(search.toLowerCase()))
  );
  
  // The main return statement is now outside of the isLoading check
  // so the title and search bar are always visible.
  return (
    <div className="min-h-screen flex flex-col items-center pt-6 px-4">
      <h1 className="font-poppins text-4xl font-bold text-center text-cyan-400 mb-4 capitalize break-words">
        {listTitles[currentListType]}
      </h1>

      <input
        type="text"
        placeholder={t('search_placeholder')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-3xl p-2 mb-6 rounded-lg border border-gray-600 bg-gray-800 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
      />

      <div className="flex flex-col gap-4 w-full max-w-3xl">
        {isLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <p className="text-center text-red-500 mt-8">{error}</p>
        ) : filteredLevels.length > 0 ? (
          filteredLevels.map((level, index) => (
            <LevelCard
              key={level.levelId || index}
              level={level}
              index={index}
              listType={currentListType}
            />
          ))
        ) : (
          <p className="text-center text-gray-400 mt-8">
            {t('no_levels_found')}
          </p>
        )}
      </div>
    </div>
  );
}