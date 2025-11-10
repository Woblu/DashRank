import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import mainStats from '../data/main-statsviewer.json';
import unratedStats from '../data/unrated-statsviewer.json';
import platformerStats from '../data/platformer-statsviewer.json';
import challengeStats from '../data/challenge-statsviewer.json';
// [FIX] Import the cleanUsername utility
import { cleanUsername } from '../utils/scoring.js'; 

const allStats = { main: mainStats, unrated: unratedStats, platformer: platformerStats, challenge: challengeStats };

export default function PlayerList() {
  const [activeList, setActiveList] = useState('main');
  const { t } = useLanguage();
  const location = useLocation();

  const currentLeaderboard = allStats[activeList] || [];
  const listTitleKey = `${activeList}_list`;

  return (
    <div className="flex flex-col items-center p-4">
      <h1 className="font-poppins text-4xl font-bold text-center text-accent mb-4 capitalize break-words"> {/* THEMED */}
        {t(listTitleKey)} {t('top_players')}
      </h1>
      <div className="flex justify-center gap-2 mb-4">
        {Object.keys(allStats).map((listType) => (
          <button
            key={listType}
            onClick={() => setActiveList(listType)}
            className={`px-3 py-1 rounded-md text-sm font-semibold transition-colors ${
              activeList === listType
                ? "bg-accent text-text-on-ui" // THEMED
                : "bg-ui-bg text-text-primary hover:bg-accent/10" // THEMED
            }`}
          >
            {t(`${listType}_list`)} {/* THEMED (Translation key fix) */}
          </button>
        ))}
      </div>
      <div className="w-full max-w-4xl p-4 bg-ui-bg rounded-lg shadow-xl"> {/* THEMED */}
        <ul className="divide-y divide-primary-bg"> {/* THEMED */}
          {currentLeaderboard.map((player) => (
            <li key={player.name} className="flex items-center justify-between py-3 gap-4">
              {/*
                [FIX] Use cleanUsername on player.name before generating the URL slug.
                This changes "/players/[67]-zoink" to "/players/zoink"
              */}
              <Link
                to={`/players/${cleanUsername(player.name).replace(/\s/g, '-')}`}
                state={{ from: location.pathname }}
                className="flex-grow min-w-0" // Allow the link to grow and shrink
              >
                <span className="font-semibold text-text-on-ui truncate"> {/* THEMED & Truncate long names */}
                  #{player.demonlistRank} - {player.name}
                </span>
              </Link>
              <span className="flex-shrink-0 w-24 text-right font-mono text-sm text-text-muted"> {/* THEMED & Fixed width for scores */}
                {player.demonlistScore?.toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}