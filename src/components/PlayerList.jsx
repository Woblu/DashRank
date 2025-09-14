import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import mainStats from '../data/main-statsviewer.json';
import unratedStats from '../data/unrated-statsviewer.json';
import platformerStats from '../data/platformer-statsviewer.json';
import challengeStats from '../data/challenge-statsviewer.json';

const allStats = { main: mainStats, unrated: unratedStats, platformer: platformerStats, challenge: challengeStats };

export default function PlayerList() {
  const [activeList, setActiveList] = useState('main');
  const { t } = useLanguage();
  const location = useLocation();

  const currentLeaderboard = allStats[activeList] || [];
  const listTitleKey = `${activeList}_list`;

  return (
    <div className="flex flex-col items-center p-4">
      <h1 className="font-poppins text-4xl font-bold text-center text-cyan-600 mb-4 capitalize break-words">
        {t(listTitleKey)} {t('top_players')}
      </h1>
      <div className="flex justify-center gap-2 mb-4">
        {Object.keys(allStats).map((listType) => (
          <button
            key={listType}
            onClick={() => setActiveList(listType)}
            className={`px-3 py-1 rounded-md text-sm font-semibold transition-colors ${
              activeList === listType
                ? "bg-cyan-500 text-white"
                : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            {t(listType)}
          </button>
        ))}
      </div>
      <div className="w-full max-w-4xl p-4 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-xl">
        <ul className="divide-y divide-gray-300 dark:divide-gray-600">
          {currentLeaderboard.map((player) => (
            // --- MODIFIED: List item structure for proper alignment ---
            <li key={player.name} className="flex items-center justify-between py-3 gap-4">
              <Link
                to={`/players/${player.name.toLowerCase().replace(/\s/g, '-')}`}
                state={{ from: location.pathname }}
                className="flex-grow min-w-0" // Allow the link to grow and shrink
              >
                <span className="font-semibold text-gray-800 dark:text-gray-200 truncate"> {/* Truncate long names */}
                  #{player.demonlistRank} - {player.name}
                </span>
              </Link>
              <span className="flex-shrink-0 w-24 text-right font-mono text-sm text-gray-600 dark:text-gray-400"> {/* Fixed width for scores */}
                {player.demonlistScore?.toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}