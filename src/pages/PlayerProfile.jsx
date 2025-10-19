import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext.jsx';
// Import lists for linking, but not for hardest calculation
import mainList from '../data/main-list.json';
import unratedList from '../data/unrated-list.json';
import platformerList from '../data/platformer-list.json';
import challengeList from '../data/challenge-list.json';
import futureList from '../data/future-list.json';
import mainStats from '../data/main-statsviewer.json'; // Still needed for Rank/Score

const allLists = { main: mainList, unrated: unratedList, platformer: platformerList, challenge: challengeList, future: futureList };
const listTitles = { main: "Main List", unrated: "Unrated List", platformer: "Platformer List", challenge: "Challenge List", future: "Future List" };

// Helper to find level details for linking
const findLevelDetails = (levelName) => {
    for (const listType of Object.keys(allLists)) {
        const level = allLists[listType].find(l => l.name.toLowerCase() === levelName.toLowerCase());
        if (level) {
            return { ...level, listType, levelName: level.name };
        }
    }
    return null; // Return null if not found in any list
};


export default function PlayerProfile() {
  const { playerName } = useParams();
  const { t } = useLanguage();
  const location = useLocation();
  const [playerData, setPlayerData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fromPath = location.state?.from || '/'; // Default to home if no path

  useEffect(() => {
    const fetchPlayerData = async () => {
      if (!playerName) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Dynamically import the specific player's stats JSON
        const specificPlayer = await import(`../data/playerstats/${playerName.toLowerCase().replace(/\s/g, '-')}-stats.json`);

        // Find overall rank/score from mainStats viewer data
        const formattedPlayerName = playerName.toLowerCase().replace(/\s/g, '-');
        const playerStats = mainStats.find(p => p.name.toLowerCase().replace(/\s/g, '-') === formattedPlayerName);

        // --- Simplified Data Processing ---
        // Get beaten demons (assuming the JSON has a `records` or similar array)
        const beatenDemons = specificPlayer.default.records?.map(record => record.name || record.levelName).filter(Boolean) || [];
        // Or if it's `demonsCompleted`
        // const beatenDemons = specificPlayer.default.demonsCompleted || [];

        // Group beaten levels by list type (for display sections)
        const beatenByList = {};
        beatenDemons.forEach(demonName => {
            const levelDetails = findLevelDetails(demonName);
            if (levelDetails) {
                if (!beatenByList[levelDetails.listType]) beatenByList[levelDetails.listType] = [];
                beatenByList[levelDetails.listType].push(levelDetails);
            }
        });

        // Find verified levels (this still needs to check all lists)
         const verifiedByList = {};
         Object.keys(allLists)
             .filter(listType => listType !== 'future') // Exclude future list from verified
             .forEach(listType => {
                 const verifiedLevels = allLists[listType].filter(level =>
                     level.verifier?.toLowerCase().replace(/\s/g, '-') === formattedPlayerName
                 );
                 if (verifiedLevels.length > 0) {
                     verifiedByList[listType] = verifiedLevels.map(level => ({...level, listType, levelName: level.name}));
                 }
             });


        // [FIX] Directly use hardest demon info from the player's JSON file
        const hardestDemonName = specificPlayer.default.hardest;
        let hardestDemonDetails = null;
        if (hardestDemonName && hardestDemonName !== 'N/A') {
            hardestDemonDetails = findLevelDetails(hardestDemonName); // Find details for linking
        }


        setPlayerData({
          name: specificPlayer.default.name,
          stats: { main: playerStats }, // Use stats from main-statsviewer
          beatenByList,
          verifiedByList,
          // [FIX] Store the pre-calculated hardest demon details
          hardestDemon: hardestDemonDetails,
        });

      } catch (error) {
        console.error("Failed to load player data:", error);
        // Handle specific error for file not found
        if (error.message.includes('Failed to fetch dynamically imported module')) {
            console.error(`Player stats file not found for: ${playerName}`);
        }
        setPlayerData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerData();
  }, [playerName]); // Rerun only when playerName changes

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

  // Use the data structure set in state
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

          {/* Display Rank/Score from main-statsviewer */}
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


          <div className="text-center border-t border-gray-300 dark:border-gray-600 pt-4 space-y-2 text-gray-800 dark:text-gray-200">
            {/* [FIX] Display the hardestDemon from state */}
            {hardestDemon ? (
              <p>
                <span className="font-semibold">{t('hardest_demon')}:</span>{' '}
                {/* Ensure levelId exists before creating link */}
                {hardestDemon.levelId ? (
                     <Link to={`/level/${hardestDemon.listType}/${hardestDemon.levelId}`} className="text-cyan-600 dark:text-cyan-400 hover:underline">
                       {hardestDemon.levelName} (#{hardestDemon.placement}) {/* Optionally show placement */}
                     </Link>
                ) : (
                    // Handle case where level details might be missing temporarily
                    <span>{hardestDemon.levelName || 'Unknown'}</span>
                )}
              </p>
            ) : (
              <p><span className="font-semibold">{t('hardest_demon')}:</span> {t('na')}</p>
            )}

            {/* Display counts */}
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

        {/* Sections for Beaten/Verified (remain largely the same, using grouped data) */}
        {Object.entries(beatenByList).map(([listType, levels]) => (
          levels.length > 0 && (
            <div key={`beaten-section-${listType}`} className="bg-gray-100 dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <h2 className="text-2xl font-bold text-center text-cyan-600 dark:text-cyan-400 mb-4">
                {listTitles[listType]} {t('completed_demons')}
              </h2>
              <div className="text-center text-gray-700 dark:text-gray-300 leading-relaxed break-words">
                {levels.sort((a,b) => (a.placement || Infinity) - (b.placement || Infinity)).map((level, index) => ( // Sort for better display
                  <React.Fragment key={`${level.levelId || level.name}-${index}`}>
                    {level.levelId ? (
                         <Link to={`/level/${level.listType}/${level.levelId}`} className="text-cyan-600 dark:text-cyan-400 hover:underline">
                           {level.levelName}
                         </Link>
                    ) : (
                         <span>{level.levelName}</span> // No link if ID missing
                    )}
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
                {levels.sort((a,b) => (a.placement || Infinity) - (b.placement || Infinity)).map((level, index) => ( // Sort for better display
                  <React.Fragment key={`${level.levelId || level.name}-${index}`}>
                     {level.levelId ? (
                         <Link to={`/level/${level.listType}/${level.levelId}`} className="text-cyan-600 dark:text-cyan-400 hover:underline">
                            {level.levelName}
                         </Link>
                     ) : (
                          <span>{level.levelName}</span> // No link if ID missing
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