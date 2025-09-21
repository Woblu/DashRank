// src/pages/Home.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import LevelCard from "../components/LevelCard";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import LoadingSpinner from "../components/LoadingSpinner";

import mainListData from '../data/main-list.json';
import unratedListData from '../data/unrated-list.json';
import platformerListData from '../data/platformer-list.json';
import speedhackListData from '../data/speedhack-list.json';
import futureListData from '../data/future-list.json';
import challengeListData from '../data/challenge-list.json';

const listDataMap = {
  main: mainListData, unrated: unratedListData, platformer: platformerListData,
  speedhack: speedhackListData, future: futureListData, challenge: challengeListData,
};

const listTitles = {
  main: "Main List", unrated: "Unrated List", platformer: "Platformer List",
  speedhack: "Speedhack List", future: "Future List", challenge: "Challenge List",
};

export default function Home() {
  const { listType } = useParams();
  const { t } = useLanguage();
  const currentListType = listType || "main";
  
  const [levels, setLevels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [creatorFilter, setCreatorFilter] = useState(""); // New state for the creator filter

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setSearch("");
    setCreatorFilter(""); // Reset filter when list changes

    const data = listDataMap[currentListType];
    if (data) {
      setLevels(data);
    } else {
      setError(`List data for '${currentListType}' not found.`);
      setLevels([]);
    }
    
    const timer = setTimeout(() => setIsLoading(false), 200);
    return () => clearTimeout(timer);
  }, [currentListType]);

  // Memoize the unique list of creators to prevent recalculating on every render
  const uniqueCreators = useMemo(() => {
    if (!levels) return [];
    const creators = levels.map(level => level.creator).filter(Boolean); // Filter out any null/undefined creators
    return [...new Set(creators)].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }, [levels]);

  const filteredLevels = levels.filter(level => {
    const searchMatch =
      level.name.toLowerCase().includes(search.toLowerCase()) ||
      (level.creator && level.creator.toLowerCase().includes(search.toLowerCase()));
    
    // If a creator is selected, the level's creator must match
    const creatorMatch = creatorFilter ? level.creator === creatorFilter : true;

    return searchMatch && creatorMatch;
  });
  
  return (
    <div className="min-h-screen flex flex-col items-center pt-6 px-4">
      <h1 className="font-poppins text-4xl font-bold text-center text-cyan-400 mb-4 capitalize break-words">
        {listTitles[currentListType]}
      </h1>

      {/* Filter Container */}
      <div className="w-full max-w-3xl mb-6 flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder={t('search_placeholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-grow p-2 rounded-lg border border-gray-600 bg-gray-800 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        />
        <select
          value={creatorFilter}
          onChange={(e) => setCreatorFilter(e.target.value)}
          className="p-2 rounded-lg border border-gray-600 bg-gray-800 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        >
          <option value="">All Creators</option>
          {uniqueCreators.map(creator => (
            <option key={creator} value={creator}>{creator}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-3xl">
        {isLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <p className="text-center text-red-500 mt-8">{error}</p>
        ) : filteredLevels.length > 0 ? (
          filteredLevels.map((level, index) => (
            <LevelCard key={level.levelId || index} level={level} index={index} listType={currentListType} />
          ))
        ) : (
          <p className="text-center text-gray-400 mt-8">{t('no_levels_found')}</p>
        )}
      </div>
    </div>
  );
}