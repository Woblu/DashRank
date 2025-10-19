import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext.jsx';
// Import all static lists
import mainList from '../data/main-list.json';
import unratedList from '../data/unrated-list.json';
import platformerList from '../data/platformer-list.json';
import challengeList from '../data/challenge-list.json';
import futureList from '../data/future-list.json';
import mainStats from '../data/main-statsviewer.json'; // For rank/score

const allLists = { main: mainList, unrated: unratedList, platformer: platformerList, challenge: challengeList, future: futureList };
const listTitles = { main: "Main List", unrated: "Unrated List", platformer: "Platformer List", challenge: "Challenge List", future: "Future List" };

// Helper to find level details in any list by name (case-insensitive)
const findLevelDetailsByName = (levelName) => {
    if (!levelName || levelName === 'N/A') return null;
    for (const listType of Object.keys(allLists)) {
        const level = allLists[listType].find(l => l.name.toLowerCase() === levelName.toLowerCase());
        if (level) {
            return { ...level, listType, levelName: level.name }; // Return full level details + listType
        }
    }
    return null; // Return null if not found
};


export default function PlayerProfile() {
  const { playerName } = useParams();
  const { t } = useLanguage();
  const location = useLocation();
  const [playerData, setPlayerData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Default back path if none provided in state
  const fromPath = location.state?.from || '/';

  useEffect(() => {
    const fetchPlayerData = async () => {
      if (!playerName) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Format name for file import and stats lookup
        const formattedFileName = playerName.toLowerCase().replace(/\s/g, '-');
        const formattedStatsName = playerName.toLowerCase(); // Assuming mainStats uses lowercase names without dashes

        // 1. Load the specific player's generated stats file
        const specificPlayerStats = await import(`../data/playerstats/${formattedFileName}-stats.json`);
        const statsJson = specificPlayerStats.default; // Access the actual data

        // 2. Get Rank/Score from main-statsviewer
        const playerRankScore = mainStats.find(p => p.name.toLowerCase() === formattedStatsName);

        // 3. [FIX] Get Hardest Demon from the generated stats file
        let hardestDemonDetails = null;
        if (statsJson.hardest && statsJson.hardest !== 'N/A') {
            // Find the full level details using the name from the stats file
             hardestDemonDetails = findLevelDetailsByName(statsJson.hardest);
             // Add the placement from the stats file if found
             if (hardestDemonDetails && statsJson.hardestPlacement) {
                 hardestDemonDetails.placement = statsJson.hardestPlacement;
             }
        }


        // 4. Restore original logic for finding beaten/verified demons from static lists

        // Find beaten demons using the 'demonsCompleted' array if it exists in the JSON
        const beatenByList = {};
        const demonsCompletedList = statsJson.demonsCompleted || statsJson.records?.map(r => r.name || r.levelName).filter(Boolean) || [];

        demonsCompletedList.forEach(demonName => {
            const levelDetails = findLevelDetailsByName(demonName);
            if (levelDetails) {
                 if (!beatenByList[levelDetails.listType]) beatenByList[levelDetails.listType] = [];
                 // Avoid duplicates if a level is verified AND beaten
                 if (!beatenByList[levelDetails.listType].some(l => l.name === levelDetails.name)) {
                    beatenByList[levelDetails.listType].push(levelDetails);
                 }
            }
        });


        // Find verified demons by checking the 'verifier' field in static lists
         const verifiedByList = {};
         Object.keys(allLists)
             .filter(listType => listType !== 'future') // Exclude future list
             .forEach(listType => {
                 const verifiedLevels = allLists[listType].filter(level =>
                     level.verifier?.toLowerCase() === formattedStatsName // Compare with lowercase name
                 );
                 if (verifiedLevels.length > 0) {
                     verifiedByList[listType] = verifiedLevels.map(level => ({...level, listType, levelName: level.name}));

                     // Add verified levels to beatenByList if not already present
                     if (!beatenByList[listType]) beatenByList[listType] = [];
                     verifiedLevels.forEach(verifiedLevel => {
                         if (!beatenByList[listType].some(l => l.name === verifiedLevel.name)) {
                             beatenByList[listType].push({...verifiedLevel, listType, levelName: verifiedLevel.name});
                         }
                     });
                 }
             });


        setPlayerData({
          name: statsJson.name, // Use name from the specific file
          stats: { main: playerRankScore }, // Rank/Score from viewer file
          beatenByList, // Populated using original logic
          verifiedByList, // Populated using original logic
          hardestDemon: hardestDemonDetails, // Use the processed hardest demon details
        });

      } catch (error) {
        console.error("Failed to load player data:", error);
         if (error.message.includes('Failed to fetch dynamically imported module')) {
            console.error(`Player stats file not found for: ${playerName}`);
        }
        setPlayerData(null); // Set to null on error
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerData();
  }, [playerName]); // Re-run only if playerName changes

  if (loading) {
    return <div className="text-center p-8 text-gray-800 dark:text-gray-200">{t('loading_data')}</div>;
  }

  if (!playerData) {
    return (
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold text-red-500">{t('player_not_found')}</h1>
        <Link to={fromPath} className="mt-4 inline-flex items-center text-cyan-600 dark:text-cyan-400 hover:underline">
          <ChevronLeft size={16} /> {t('back_to_home')}
        </Link>
      </div>
    );
  }

  // Destructure state after check
  const { name, stats, beatenByList, verifiedByList, hardestDemon } = playerData;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <Link to={fromPath} className="mb-4 inline-flex items-center text-cyan-600 dark:text-cyan-400 hover:underline">
        <ChevronLeft size={20} />
        {t('back_to_home')}
      </Link>

      <div className="space-y-6">
        {/* Main Info Box */}
        <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <h1 className="font-poppins text-4xl font-bold text-cyan-600 dark:text-cyan-400 mb-4 text-center">
            {name}
          </h1>

          {/* Rank/Score */}
          {stats.main ? (
            <div className="text-center mb-4 text-gray-800 dark:text-gray-200">
              <p><span className="font-semibold">{t('demonlist_rank')}:</span> #{stats.main.demonlistRank || t('na')}</p>
              <p><span className="font-semibold">{t('demonlist_score')}:</span> {stats.main.demonlistScore?.toFixed(2) || t('na')}</p>
            </div>
          ) : (
             <div className="text-center mb-4 text-gray-500 dark:text-gray-400">
                <p>Player not ranked on the main list.</p>
             </div>
          )}

          {/* Stats Summary */}
          <div className="text-center border-t border-gray-300 dark:border-gray-600 pt-4 space-y-2 text-gray-800 dark:text-gray-200">
            {/* [FIX] Display Hardest Demon from state, including placement */}
            {hardestDemon ? (
              <p>
                <span className="font-semibold">{t('hardest_demon')}:</span>{' '}
                {hardestDemon.levelId || hardestDemon.id ? ( // Check if linkable
                     <Link to={`/level/${hardestDemon.listType}/${hardestDemon.levelId || hardestDemon.id}`} className="text-cyan-600 dark:text-cyan-400 hover:underline">
                       {hardestDemon.levelName} (#{hardestDemon.placement}) {/* Show placement */}
                     </Link>
                ) : (
                    <span>{hardestDemon.levelName} (#{hardestDemon.placement || '?'})</span> // Show name/placement even if not linkable
                )}
              </p>
            ) : (
              <p><span className="font-semibold">{t('hardest_demon')}:</span> {t('na')}</p>
            )}

            {/* Counts from restored logic */}
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

        {/* Beaten Demons Sections (Restored) */}
        {Object.entries(beatenByList).map(([listType, levels]) => (
          levels.length > 0 && (
            <div key={`beaten-section-${listType}`} className="bg-gray-100 dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <h2 className="text-2xl font-bold text-center text-cyan-600 dark:text-cyan-400 mb-4">
                {listTitles[listType]} {t('completed_demons')}
              </h2>
              <div className="text-center text-gray-700 dark:text-gray-300 leading-relaxed break-words">
                {/* Sort levels by placement for display */}
                {levels.sort((a,b) => (a.placement || Infinity) - (b.placement || Infinity)).map((level, index) => (
                  <React.Fragment key={`${level.id || level.name}-${index}`}>
                    {/* Link only if levelId or id exists */}
                    {(level.levelId || level.id) ? (
                         <Link to={`/level/${level.listType}/${level.levelId || level.id}`} className="text-cyan-600 dark:text-cyan-400 hover:underline">
                           {level.levelName}
                         </Link>
                    ) : (
                         <span>{level.levelName}</span>
                    )}
                    {index < levels.length - 1 && ' - '}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )
        ))}

        {/* Verified Demons Sections (Restored) */}
        {Object.entries(verifiedByList).map(([listType, levels]) => (
          levels.length > 0 && (
            <div key={`verified-section-${listType}`} className="bg-gray-100 dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <h2 className="text-2xl font-bold text-center text-cyan-600 dark:text-cyan-400 mb-4">
                {listTitles[listType]} {t('verified_demons')}
              </h2>
              <div className="text-center text-gray-700 dark:text-gray-300 leading-relaxed break-words">
                 {/* Sort levels by placement for display */}
                {levels.sort((a,b) => (a.placement || Infinity) - (b.placement || Infinity)).map((level, index) => (
                  <React.Fragment key={`${level.id || level.name}-${index}`}>
                     {(level.levelId || level.id) ? (
                         <Link to={`/level/${level.listType}/${level.levelId || level.id}`} className="text-cyan-600 dark:text-cyan-400 hover:underline">
                            {level.levelName}
                         </Link>
                     ) : (
                          <span>{level.levelName}</span>
                     )}
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