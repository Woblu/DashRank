// src/components/StatsViewer.jsx
import React, { useState, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import mainStats from '../data/main-statsviewer.json';
import unratedStats from '../data/unrated-statsviewer.json';
import platformerStats from '../data/platformer-statsviewer.json';
import challengeStats from '../data/challenge-statsviewer.json';
import speedhackStats from '../data/speedhack-statsviewer.json';
import futureStats from '../data/future-statsviewer.json';

const statsData = { main: mainStats, unrated: unratedStats, platformer: platformerStats, challenge: challengeStats, speedhack: speedhackStats, future: futureStats };

export default function StatsViewer({ onClose, listType, title }) {
  const [search, setSearch] = useState('');
  const location = useLocation();
  const { t } = useLanguage();

  const players = useMemo(() => statsData[listType] || [], [listType]);

  const filteredPlayers = players.filter(
    (player) =>
      player.name.toLowerCase().includes(search.toLowerCase()) ||
      (player.clan && player.clan.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" 
        onClick={onClose}
    >
      <div 
        className="bg-ui-bg rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]" /* THEMED */
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-4 border-b border-primary-bg flex justify-between items-center"> {/* THEMED */}
          <h2 className="text-xl font-bold text-text-on-ui">{title}</h2> {/* THEMED */}
          <button onClick={onClose} className="p-1 rounded-full text-text-on-ui hover:bg-primary-bg transition-colors"> {/* THEMED */}
            <X className="w-6 h-6" /> {/* THEMED */}
          </button>
        </header>
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" /> {/* THEMED */}
            <input
              type="text"
              placeholder={t('search_player_placeholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 p-2 rounded-lg border border-primary-bg bg-primary-bg text-text-primary" /* THEMED */
            />
          </div>
        </div>
        <ul className="flex-grow overflow-y-auto custom-scrollbar space-y-2 p-4">
          {filteredPlayers.map((player) => (
            <li key={player.name} className="flex items-center p-2 rounded-lg bg-primary-bg shadow-sm"> {/* THEMED */}
              <span className="font-bold text-lg text-accent w-10 text-left"> {/* THEMED */}
                #{player.demonlistRank}
              </span>
              <Link
                to={`/players/${player.name.toLowerCase().replace(/\s/g, '-')}`}
                state={{ from: location.pathname }}
                className="flex-1 text-text-primary font-semibold text-left hover:underline" /* THEMED */
                onClick={onClose}
              >
                {player.name}
              </Link>
              <span className="text-text-muted font-mono text-right"> {/* THEMED */}
                {player.demonlistScore.toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}