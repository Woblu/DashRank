import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
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
      try {
        const specificPlayer = await import(`../data/playerstats/${playerName.toLowerCase()}-stats.json`);
        
        const formattedPlayerName = playerName.toLowerCase();
        const playerStats = mainStats.find(p => p.name.toLowerCase().replace(/\s/g, '-') === formattedPlayerName);

        const beatenByList = {};
        if (specificPlayer.demonsCompleted) {
            specificPlayer.demonsCompleted.forEach(demonName => {
                for (const listType of Object.keys(allLists)) {
                    const level = allLists[listType].find(l => l.name.toLowerCase() === demonName.toLowerCase());
                    if (level) {
                        if (!beatenByList[listType]) beatenByList[listType] = [];
                        beatenByList[listType].push({ ...level, listType, levelName: level.name });
                        break;
                    }
                }
            });
        }

        const verifiedByList = {};
        Object.keys(allLists)
            .filter(listType => listType !== 'future')
            .forEach(listType => {
                const verifiedLevels = allLists[listType].filter(level => 
                    level.verifier && level.verifier.toLowerCase().replace(/\s/g, '-') === formattedPlayerName
                );
                if (verifiedLevels.length > 0) {
                    verifiedByList[listType] = verifiedLevels.map(level => ({...level, listType, levelName: level.name}));
                }
            });

        const mainCompletions = [...(beatenByList.main || []), ...(verifiedByList.main || [])];
        const uniqueMainCompletions = Array.from(new Map(mainCompletions.map(l => [l.levelId || l.name, l])).values());
        const hardestDemon = uniqueMainCompletions
            .filter(level => level.placement)
            .sort((a, b) => a.placement - b.placement)[0];

        setPlayerData({
          name: specificPlayer.name,
          stats: { main: playerStats },
          beatenByList,
          verifiedByList,
          hardestDemon,
        });
      } catch (error) {
        console.error("Failed to load player data:", error);
        setPlayerData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerData();
  }, [playerName]);

  if (loading) {
    return <div className="text-center p-8 text-gray-800 dark:text-gray-200">{t('loading_data')}</div>;
  }

  if (!playerData) {
    return (
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold text-red-500">{t('player_not_found')}</h1>
        <Link to={fromPath} className="mt-4 inline-flex items-center text-cyan-600 hover:underline">
          <ChevronLeft size={16} /> {t('back_to_home')}
        </Link>
      </div>
    );
  }

  const { name, stats, beatenByList, verifiedByList, hardestDemon } = playerData;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <Link to={fromPath} className="mb-4 inline-flex items-center text-cyan-600 dark:text-cyan-400 hover:underline">
        <ChevronLeft size={20} />
        {t('back_to_home')}
      </Link>
      
      <div className="space-y-6">
        <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          
          <h1 className="font-poppins text-4xl font-bold text-cyan-600 dark:text-cyan-400 mb-4 text-center">
            {name}
          </h1>
          
          {stats.main && (
            <div className="text-center mb-4 text-gray-800 dark:text-gray-200">
              <p><span className="font-semibold">{t('demonlist_rank')}:</span> #{stats.main.demonlistRank || t('na')}</p>
              <p><span className="font-semibold">{t('demonlist_score')}:</span> {stats.main.demonlistScore?.toFixed(2) || t('na')}</p>
            </div>
          )}

          <div className="text-center border-t border-gray-300 dark:border-gray-600 pt-4 space-y-2 text-gray-800 dark:text-gray-200">
            {hardestDemon ? (
              <p><span className="font-semibold">{t('hardest_demon')}:</span> <Link to={`/level/${hardestDemon.listType}/${hardestDemon.levelId}`} className="text-cyan-600 hover:underline">{hardestDemon.levelName}</Link></p>
            ) : (
              <p><span className="font-semibold">{t('hardest_demon')}:</span> {t('na')}</p>
            )}
            
            {Object.entries(beatenByList).map(([listType, levels]) => (
                levels.length > 0 && (
                    <p key={`beaten-${listType}`}>
                        <span className="font-semibold">{listTitles[listType]} {t('completed_demons')}:</span> {levels.length}
                    </p>
                )
            ))}
            {Object.entries(verifiedByList).map(([listType, levels]) => (
                levels.length > 0 && (
                    <p key={`verified-${listType}`}>
                        <span className="font-semibold">{listTitles[listType]} {t('verified_demons')}:</span> {levels.length}
                    </p>
                )
            ))}
          </div>
        </div>

        {Object.entries(beatenByList).map(([listType, levels]) => (
          levels.length > 0 && (
            <div key={`beaten-section-${listType}`} className="bg-gray-100 dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <h2 className="text-2xl font-bold text-center text-cyan-600 dark:text-cyan-400 mb-4">
                {listTitles[listType]} {t('completed_demons')}
              </h2>
              <div className="text-center text-gray-700 dark:text-gray-300 leading-relaxed break-words">
                {levels.map((level, index) => (
                  <React.Fragment key={`${level.levelId}-${index}`}>
                    <Link to={`/level/${level.listType}/${level.levelId}`} className="text-cyan-600 hover:underline">{level.levelName}</Link>
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
                    <Link to={`/level/${level.listType}/${level.levelId}`} className="text-cyan-600 hover:underline">{level.levelName}</Link>
                    {index < levels.length - 1 && ' - '}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
}