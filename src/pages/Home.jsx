// src/pages/Home.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useParams, useLocation } from "react-router-dom";
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext.jsx';
import LevelCard from "../components/LevelCard";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import AddPersonalRecordForm from "../components/AddPersonalRecordForm";
import { PlusCircle } from 'lucide-react';

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
  progression: "Progression Tracker"
};

export default function Home() {
  const { listType } = useParams();
  const location = useLocation();
  const { t } = useLanguage();
  const { user, token } = useAuth();
  const currentListType = location.pathname.startsWith('/progression') ? 'progression' : (listType || "main");
  
  const [levels, setLevels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);

  const fetchLevels = async () => {
    setIsLoading(true);
    setError(null);
    setSearch("");
    try {
      let responseData;
      if (currentListType === 'progression') {
        if (!token) { setLevels([]); return; }
        const response = await axios.get('/api/personal-records', {
          headers: { Authorization: `Bearer ${token}` }
        });
        responseData = response.data.map((record) => ({
          id: record.id,
          placement: record.placement,
          name: record.levelName,
          creator: user.username,
          videoId: record.videoUrl,
          thumbnail: record.thumbnailUrl,
          records: [],
          list: 'progression',
        }));
      } else {
        responseData = listDataMap[currentListType];
      }
      if (responseData) setLevels(responseData);
      else { setError(`List data for '${currentListType}' not found.`); setLevels([]); }
    } catch (err) {
      console.error("Failed to fetch levels:", err);
      setError(`Failed to load '${listTitles[currentListType]}'. Please try again later.`);
      setLevels([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLevels();
  }, [currentListType, token]);

  const filteredLevels = levels.filter(level => {
    const searchMatch =
      level.name.toLowerCase().includes(search.toLowerCase()) ||
      (level.creator && level.creator.toLowerCase().includes(search.toLowerCase()));
    return searchMatch;
  });
  
  return (
    <>
      <div className="min-h-screen flex flex-col items-center pt-6 px-4">
        <div className="w-full max-w-3xl flex justify-center sm:justify-between items-center mb-4 relative">
          <h1 className="font-poppins text-4xl font-bold text-center text-cyan-600 dark:text-cyan-400 capitalize break-words">
            {listTitles[currentListType]}
          </h1>
          {currentListType === 'progression' && user && (
            <button 
              onClick={() => setIsAddFormOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-cyan-600 hover:bg-cyan-700 text-white transition-colors text-sm absolute right-0"
            >
              <PlusCircle className="w-5 h-5" /> Add Record
            </button>
          )}
        </div>
        <div className="w-full max-w-3xl mb-6">
          <input
            type="text"
            placeholder={t('search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
        <div className="flex flex-col gap-4 w-full max-w-3xl">
          {isLoading ? (
            <p className="text-center text-gray-500 dark:text-gray-400 mt-8">Loading...</p>
          ) : error ? (
            <p className="text-center text-red-500 mt-8">{error}</p>
          ) : filteredLevels.length > 0 ? (
            filteredLevels.map((level, index) => (
              <LevelCard key={level.id || level.levelId || index} level={level} index={index} listType={currentListType} />
            ))
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 mt-8">
              {currentListType === 'progression' ? "You haven't added any records yet." : t('no_levels_found')}
            </p>
          )}
        </div>
      </div>
      {isAddFormOpen && <AddPersonalRecordForm recordCount={levels.length} onClose={() => setIsAddFormOpen(false)} onRecordAdded={fetchLevels} />}
    </>
  );
}