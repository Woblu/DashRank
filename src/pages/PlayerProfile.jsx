import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import mainList from '../data/main-list.json';
import unratedList from '../data/unrated-list.json';
import platformerList from '../data/platformer-list.json';
import challengeList from '../data/challenge-list.json';
import futureList from '../data/future-list.json';
import mainStats from '../data/main-statsviewer.json';

const allLists = { main: mainList, unrated: unratedList, platformer: platformerList, challenge: challengeList, future: futureList };
const listTitles = { main: "Main List", unrated: "Unrated List", platformer: "Platformer List", challenge: "Challenge List", future: "Future List" };

// New component to handle the video link logic
const PlayerLevelLink = ({ level, playerName }) => {
  const navigate = useNavigate();

  const handleClick = (e) => {
    e.preventDefault(); // Prevent the default link navigation

    let videoUrl = null;

    // 1. Check if the player is the verifier
    if (level.verifier.toLowerCase() === playerName.toLowerCase()) {
      videoUrl = `https://www.youtube.com/watch?v=${level.videoId}`;
    } else {
      // 2. Find a record for the player in the level's records
      const playerRecord = level.records?.find(
        (record) => record.username.toLowerCase() === playerName.toLowerCase()
      );
      if (playerRecord && playerRecord.videoId) {
        videoUrl = `https://www.youtube.com/watch?v=${playerRecord.videoId}`;
      }
    }

    // 3. If a video was found, open it in a new tab
    if (videoUrl) {
      window.open(videoUrl, '_blank', 'noopener,noreferrer');
    } else {
      // 4. Otherwise, navigate to the level detail page
      navigate(`/level/${level.listType}/${level.levelId}`);
    }
  };

  return (
    <a href={`/level/${level.listType}/${level.levelId}`} onClick={handleClick} className="text-cyan-600 hover:underline">
      {level.levelName}
    </a>
  );
};


export default function PlayerProfile() {
  const { playerName } = useParams();
  const { t } = useLanguage();
  const location = useLocation();
  const [playerData, setPlayerData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fromPath = location.state?.from || '/players';

  useEffect(() => {
    const fetchPlayerData = async () => {
      if (!playerName) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      const formattedPlayerName = playerName.replace(/-/g, ' ');
      
      const stats = mainStats.find(p => p.name.toLowerCase() === formattedPlayerName.toLowerCase());

      const completedByList = {};
      const verifiedByList = {};

      Object.entries(allLists).forEach(([listType, list]) => {
        completedByList[listType] = list
          .filter(level => level.records?.some(record => record.username.toLowerCase() === formattedPlayerName.toLowerCase()))
          .map(level => ({ levelId: level.levelId, levelName: level.name, listType, verifier: level.verifier, records: level.records, videoId: level.videoId }));
          
        verifiedByList[listType] = list
          .filter(level => level.verifier.toLowerCase() === formattedPlayerName.toLowerCase())
          .map(level => ({ levelId: level.levelId, levelName: level.name, listType, verifier: level.verifier, records: level.records, videoId: level.videoId }));
      });
      
      setPlayerData({ stats, completedByList, verifiedByList });
      setLoading(false);
    };

    fetchPlayerData();
  }, [playerName]);

  if (loading) {
    return <p className="text-center text-gray-500 mt-8">{t('loading_data')}</p>;
  }

  if (!playerData || !playerData.stats) {
    return (
      <div className="text-center">
        <p className="text-xl text-red-500">{t('player_not_found')}</p>
        <Link to={fromPath} className="mt-4 inline-flex items-center text-cyan-600 hover:underline">
          <ChevronLeft className="w-4 h-4 mr-1" />
          {t('back_to_list')}
        </Link>
      </div>
    );
  }

  const { stats, completedByList, verifiedByList } = playerData;
  const normalizedPlayerName = playerName.replace(/-/g, ' ');

  return (
    <div className="max-w-4xl mx-auto p-4">
      <Link to={fromPath} className="inline-flex items-center text-cyan-600 hover:underline mb-4">
        <ChevronLeft className="w-4 h-4 mr-1" />
        {t('back_to_list')}
      </Link>

      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold text-gray-900 dark:text-gray-100">{stats.name}</h1>
        {stats.clan && <p className="text-xl text-gray-500 dark:text-gray-400 mt-1">[{stats.clan}]</p>}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-xl shadow-lg text-center">
          <p className="text-lg text-gray-600 dark:text-gray-300">{t('rank')}</p>
          <p className="text-4xl font-bold text-cyan-600">#{stats.demonlistRank}</p>
        </div>
        <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-xl shadow-lg text-center">
          <p className="text-lg text-gray-600 dark:text-gray-300">{t('score')}</p>
          <p className="text-4xl font-bold text-cyan-600">{stats.demonlistScore.toFixed(2)}</p>
        </div>
      </div>

      {Object.entries(completedByList).map(([listType, levels]) => (
        levels.length > 0 && (
          <div key={`completed-section-${listType}`} className="bg-gray-100 dark:bg-gray-800 p-6 rounded-xl shadow-lg mb-6">
            <h2 className="text-2xl font-bold text-center text-cyan-600 dark:text-cyan-400 mb-4">
              {listTitles[listType]} {t('completed_demons')}
            </h2>
            <div className="text-center text-gray-700 dark:text-gray-300 leading-relaxed break-words">
              {levels.map((level, index) => (
                <React.Fragment key={`${level.levelId}-${index}`}>
                  <PlayerLevelLink level={level} playerName={normalizedPlayerName} />
                  {index < levels.length - 1 && ' - '}
                </React.Fragment>
              ))}
            </div>
          </div>
        )
      ))}

      {Object.entries(verifiedByList).map(([listType, levels]) => (
        levels.length > 0 && (
          <div key={`verified-section-${listType}`} className="bg-gray-100 dark:bg-gray-800 p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-center text-cyan-600 dark:text-cyan-400 mb-4">
              {listTitles[listType]} {t('verified_demons')}
            </h2>
            <div className="text-center text-gray-700 dark:text-gray-300 leading-relaxed break-words">
              {levels.map((level, index) => (
                <React.Fragment key={`${level.levelId}-${index}`}>
                  <PlayerLevelLink level={level} playerName={normalizedPlayerName} />
                  {index < levels.length - 1 && ' - '}
                </React.Fragment>
              ))}
            </div>
          </div>
        )
      ))}
    </div>
  );
}