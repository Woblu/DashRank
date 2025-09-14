// src/pages/Home.jsx
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import LevelCard from "../components/LevelCard";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import mainList from "../data/main-list.json";
import unratedList from "../data/unrated-list.json";
import platformerList from "../data/platformer-list.json";
import futureList from "../data/future-list.json";
import speedhackList from "../data/speedhack-list.json"; // 1. Import the speedhack list
import challengeList from "../data/challenge-list.json";
import tslList from "../data/tsl-list.json";
import tslplus from "../data/tslplus.json";

const lists = {
  main: mainList,
  unrated: unratedList,
  platformer: platformerList,
  speedhack: speedhackList, // 2. Use the imported array here
  future: futureList,
  challenge: challengeList,
  tsl: tslList,
  tslplus: tslplus,
};

const listTitles = {
  main: "Main List",
  unrated: "Unrated List",
  platformer: "Platformer List",
  speedhack: "Speedhack List",
  future: "Future List",
  challenge: "Challenge List",
  tsl: "The Shitty List",
  tslplus: "The Shitty List+",
};

export default function Home() {
  const { listType } = useParams();
  const { t } = useLanguage();
  const currentListType = listType || "main";
  const levels = lists[currentListType] || [];
  
  const [search, setSearch] = useState("");

  useEffect(() => {
    setSearch("");
  }, [currentListType]);

  const filteredLevels = levels.filter(
    (level) =>
      level.name.toLowerCase().includes(search.toLowerCase()) ||
      (level.creator && level.creator.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-50 dark:bg-gray-900 pt-6 px-4">
      <h1 className="font-poppins text-4xl font-bold text-center text-cyan-600 mb-4 capitalize break-words">
        {listTitles[currentListType]}
      </h1>

      <input
        type="text"
        placeholder={t('search_placeholder')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-3xl p-2 mb-6 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
      />

      <div className="flex flex-col gap-4 w-full max-w-3xl">
        {filteredLevels.length > 0 ? (
          filteredLevels.map((level, index) => (
            <LevelCard
              key={level.levelId || index}
              level={level}
              index={index}
              listType={currentListType}
            />
          ))
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400 mt-8">
            {t('no_levels_found')}
          </p>
        )}
      </div>
    </div>
  );
}