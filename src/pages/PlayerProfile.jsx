import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner'; // Assuming you have this

// Import static lists only for linking and display details
import mainList from '../data/main-list.json';
import unratedList from '../data/unrated-list.json';
import platformerList from '../data/platformer-list.json';
import challengeList from '../data/challenge-list.json';
import futureList from '../data/future-list.json';

const allLists = { main: mainList, unrated: unratedList, platformer: platformerList, challenge: challengeList, future: futureList };
const listTitles = { main: "Main List", unrated: "Unrated List", platformer: "Platformer List", challenge: "Challenge List", future: "Future List" };

// Helper to find level details in static lists by name (case-insensitive)
const findLevelDetailsByName = (levelName) => {
    if (!levelName || levelName === 'N/A') return null;
    for (const listType of Object.keys(allLists)) {
        const level = allLists[listType].find(l => l.name?.toLowerCase() === levelName.toLowerCase());
        if (level) {
            return { ...level, listType, levelName: level.name };
        }
    }
    // Keep this warning commented unless actively debugging missing levels
    // console.warn(`[PlayerProfile] Level details not found for name: "${levelName}" in static lists.`);
    return null;
};


export default function PlayerProfile() {
  const { playerName } = useParams();
  const { t } = useLanguage();
  const location = useLocation();
  const [playerData, setPlayerData] = useState(null); // Will store combined data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fromPath = location.state?.from || '/';

  useEffect(() => {
    const fetchPlayerData = async () => {
      if (!playerName) {
        setError("Player name not provided.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setPlayerData(null);

      try {
        console.log(`[PlayerProfile] Fetching stats for: ${playerName}`);
        const response = await axios.get(`/api/player-stats/${encodeURIComponent(playerName)}`);
        const apiData = response.data; // { playerStat, user, verifiedLevels, completedLevels }
        console.log("[PlayerProfile] Received data from API:", apiData);

        if (!apiData.playerStat && !apiData.user && apiData.verifiedLevels?.length === 0 && apiData.completedLevels?.length === 0) {
            throw new Error(`Player "${playerName}" not found or has no stats.`); // Trigger catch block for 404-like scenario
        }

        // --- Process Hardest Demon ---
        let hardestDemonDetails = null;
        const stats = apiData.playerStat; // Get stats from the API response
        if (stats?.hardestDemonName && stats.hardestDemonName !== 'N/A') {
            hardestDemonDetails = findLevelDetailsByName(stats.hardestDemonName);
            if (hardestDemonDetails && stats.hardestDemonPlacement) {
                hardestDemonDetails.placement = stats.hardestDemonPlacement;
            } else if (!hardestDemonDetails) {
                 hardestDemonDetails = {
                     levelName: stats.hardestDemonName,
                     placement: stats.hardestDemonPlacement || '?',
                     listType: 'main' // Assume main
                 };
            }
        }
        console.log("[PlayerProfile] Processed hardest demon:", hardestDemonDetails);


        // --- Process Completed Levels ---
        const beatenByList = {};
        const uniqueBeatenNames = new Set();
        // Use completedLevels array from API response
        apiData.completedLevels?.forEach(level => {
            if (!level.name || uniqueBeatenNames.has(level.name.toLowerCase())) return;
             // Find full details (like levelId) using static lists for linking
             const levelDetails = findLevelDetailsByName(level.name);
             if (levelDetails) {
                 if (!beatenByList[levelDetails.listType]) beatenByList[levelDetails.listType] = [];
                 beatenByList[levelDetails.listType].push(levelDetails);
                 uniqueBeatenNames.add(levelDetails.name.toLowerCase());
             } else {
                 // Fallback if details missing - add with basic info from API response
                 const listType = level.list || 'unknown';
                 if (!beatenByList[listType]) beatenByList[listType] = [];
                 beatenByList[listType].push({
                     ...level,
                     listType: listType,
                     levelName: level.name // Ensure levelName exists
                 });
                 uniqueBeatenNames.add(level.name.toLowerCase());
                 console.warn(`Could not find full static details for completed level: ${level.name}`);
             }
        });
        console.log("[PlayerProfile] Processed beaten lists:", beatenByList);


        // --- Process Verified Levels ---
        const verifiedByList = {};
        // Use verifiedLevels array from API response
        apiData.verifiedLevels?.forEach(level => {
             // Find full details (like levelId) using static lists for linking
             const levelDetails = findLevelDetailsByName(level.name);
             if (levelDetails) {
                if (!verifiedByList[levelDetails.listType]) verifiedByList[levelDetails.listType] = [];
                // Avoid duplicates within verified list (though API might already handle this)
                if (!verifiedByList[levelDetails.listType].some(l => l.name === levelDetails.name)) {
                   verifiedByList[levelDetails.listType].push(levelDetails);
                }
             } else {
                  // Fallback if details missing
                 const listType = level.list || 'unknown';
                 if (!verifiedByList[listType]) verifiedByList[listType] = [];
                  verifiedByList[listType].push({
                     ...level,
                     listType: listType,
                     levelName: level.name // Ensure levelName exists
                 });
                 console.warn(`Could not find full static details for verified level: ${level.name}`);
             }
        });
        console.log("[PlayerProfile] Processed verified lists:", verifiedByList);


        // Set the final state
        setPlayerData({
          // Use name from playerStat if available, fallback to user, then request param
          name: stats?.name || apiData.user?.username || playerName,
          stats: stats, // Store the Playerstats object (can be null)
          beatenByList,
          verifiedByList,
          hardestDemon: hardestDemonDetails, // Stored processed details
        });

      } catch (err) {
        console.error("Failed to load player data:", err);
        // Use error message from API if available, otherwise provide generic one
        setError(err.response?.data?.message || err.message || "An error occurred while fetching player data.");
        setPlayerData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerData();
  }, [playerName]); // Re-run effect if playerName changes

  if (loading) {
    return <LoadingSpinner message={t('loading_data')} />;
  }

  // Handle error state after loading
  if (error || !playerData) {
    return (
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold text-red-500">{error || t('player_not_found')}</h1>
        <Link to={fromPath} className="mt-4 inline-flex items-center text-cyan-600 dark:text-cyan-400 hover:underline">
          <ChevronLeft size={16} /> {t('back_to_home')}
        </Link>
      </div>
    );
  }

  // Destructure data for rendering - stats might be null
  const { name, stats, beatenByList, verifiedByList, hardestDemon } = playerData;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Back Link */}
      <Link to={fromPath} className="mb-4 inline-flex items-center text-cyan-600 dark:text-cyan-400 hover:underline">
        <ChevronLeft size={20} />
        {t('back_to_home')}
      </Link>

      <div className="space-y-6">
        {/* Main Info Box */}
        <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          {/* Player Name */}
          <h1 className="font-poppins text-4xl font-bold text-cyan-600 dark:text-cyan-400 mb-4 text-center">
            {name} {/* Display name from state */}
          </h1>

          {/* Rank/Score from DB stats */}
          {stats ? ( // Check if stats object exists
            <div className="text-center mb-4 text-gray-800 dark:text-gray-200">
              <p>
                  <span className="font-semibold">{t('demonlist_rank')}:</span>{' '}
                  {stats.demonlistRank !== null ? `#${stats.demonlistRank}` : t('na')}
              </p>
              <p>
                  <span className="font-semibold">{t('demonlist_score')}:</span>{' '}
                  {stats.demonlistScore !== null ? stats.demonlistScore.toFixed(2) : t('na')}
              </p>
            </div>
          ) : (
             <div className="text-center mb-4 text-gray-500 dark:text-gray-400">
                <p>Player not ranked on the main list.</p>
             </div>
          )}

          {/* Stats Summary */}
          <div className="text-center border-t border-gray-300 dark:border-gray-600 pt-4 space-y-2 text-gray-800 dark:text-gray-200">
            {/* Hardest Demon Display */}
            {hardestDemon && hardestDemon.levelName ? (
              <p>
                <span className="font-semibold">{t('hardest_demon')}:</span>{' '}
                {(hardestDemon.levelId || hardestDemon.id) ? (
                     <Link to={`/level/${hardestDemon.listType}/${hardestDemon.levelId || hardestDemon.id}`} className="text-cyan-600 dark:text-cyan-400 hover:underline">
                       {hardestDemon.levelName} (#{hardestDemon.placement})
                     </Link>
                ) : ( <span>{hardestDemon.levelName} (#{hardestDemon.placement || '?'})</span> )}
              </p>
            ) : ( <p><span className="font-semibold">{t('hardest_demon')}:</span> {t('na')}</p> )}

            {/* Counts */}
            {Object.entries(beatenByList).map(([listType, levels]) => ( levels.length > 0 && (
                <p key={`beaten-count-${listType}`}>
                    <span className="font-semibold">{listTitles[listType]} {t('completed_demons')}:</span> {levels.length}
                </p>
             )))}
            {Object.entries(verifiedByList).map(([listType, levels]) => ( levels.length > 0 && (
                <p key={`verified-count-${listType}`}>
                    <span className="font-semibold">{listTitles[listType]} {t('verified_demons')}:</span> {levels.length}
                </p>
             )))}
          </div>
        </div>

        {/* Beaten Demons Sections */}
        {Object.entries(beatenByList).map(([listType, levels]) => ( levels.length > 0 && (
            <div key={`beaten-section-${listType}`} className="bg-gray-100 dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold text-center text-cyan-600 dark:text-cyan-400 mb-4">
                    {listTitles[listType]} {t('completed_demons')}
                </h2>
                <div className="text-center text-gray-700 dark:text-gray-300 leading-relaxed break-words">
                    {levels.sort((a,b) => (a.placement || Infinity) - (b.placement || Infinity)).map((level, index) => (
                        <React.Fragment key={`${level.id || level.name}-beaten-${index}`}>
                            {(level.levelId || level.id) ? (
                                <Link to={`/level/${level.listType}/${level.levelId || level.id}`} className="text-cyan-600 dark:text-cyan-400 hover:underline">
                                {level.levelName}
                                </Link>
                            ) : ( <span>{level.levelName}</span> )}
                            {index < levels.length - 1 && ' - '}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        )))}

        {/* Verified Demons Sections */}
        {Object.entries(verifiedByList).map(([listType, levels]) => ( levels.length > 0 && (
            <div key={`verified-section-${listType}`} className="bg-gray-100 dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                 <h2 className="text-2xl font-bold text-center text-cyan-600 dark:text-cyan-400 mb-4">
                    {listTitles[listType]} {t('verified_demons')}
                 </h2>
                <div className="text-center text-gray-700 dark:text-gray-300 leading-relaxed break-words">
                    {levels.sort((a,b) => (a.placement || Infinity) - (b.placement || Infinity)).map((level, index) => (
                        <React.Fragment key={`${level.id || level.name}-verified-${index}`}>
                            {(level.levelId || level.id) ? (
                                <Link to={`/level/${level.listType}/${level.levelId || level.id}`} className="text-cyan-600 dark:text-cyan-400 hover:underline">
                                    {level.levelName}
                                </Link>
                            ) : ( <span>{level.levelName}</span> )}
                            {index < levels.length - 1 && ' - '}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        )))}
      </div>
    </div>
  );
}