import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import axios from 'axios'; // Import axios for API calls
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
// Needed for linking completed/verified levels
const findLevelDetailsByName = (levelName) => {
    if (!levelName || levelName === 'N/A') return null;
    for (const listType of Object.keys(allLists)) {
        // Find level, ensuring case-insensitivity comparison
        const level = allLists[listType].find(l => l.name?.toLowerCase() === levelName.toLowerCase());
        if (level) {
            // Return details including listType and ensuring levelName is correct case
            return { ...level, listType, levelName: level.name };
        }
    }
    console.warn(`[PlayerProfile] Level details not found for name: "${levelName}" in static lists.`);
    return null;
};


export default function PlayerProfile() {
  const { playerName } = useParams(); // Get player name from URL parameter
  const { t } = useLanguage();
  const location = useLocation();
  const [playerData, setPlayerData] = useState(null); // Will store { user, playerStat, beatenByList, verifiedByList }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // State for API errors

  const fromPath = location.state?.from || '/'; // Default back path

  useEffect(() => {
    const fetchPlayerData = async () => {
      if (!playerName) {
        setError("Player name not provided in URL.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null); // Clear previous errors
      setPlayerData(null); // Clear previous data

      try {
        console.log(`[PlayerProfile] Fetching stats for: ${playerName}`);
        // [FETCH] Call the new API endpoint
        // Use encodeURIComponent in case player names have special characters
        const response = await axios.get(`/api/player-stats/${encodeURIComponent(playerName)}`);

        const data = response.data;
        console.log("[PlayerProfile] Received data from API:", data);

        // Process fetched data (if necessary, structure might differ slightly)
        const stats = data.playerStat; // Assuming API returns { user, playerStat }

        // Find hardest demon details using fetched data
        let hardestDemonDetails = null;
        if (stats?.hardestDemonName && stats.hardestDemonName !== 'N/A') {
            hardestDemonDetails = findLevelDetailsByName(stats.hardestDemonName);
            if (hardestDemonDetails && stats.hardestDemonPlacement) {
                hardestDemonDetails.placement = stats.hardestDemonPlacement;
            } else if (!hardestDemonDetails) {
                 // Create placeholder if static list lookup failed
                 hardestDemonDetails = {
                     levelName: stats.hardestDemonName,
                     placement: stats.hardestDemonPlacement || '?',
                     listType: 'main' // Assume main list if details missing
                 };
            }
        }

        // Process Beaten/Verified (assuming API returns IDs or names)
        // This part depends heavily on what your new API endpoint returns.
        // Option 1: API returns full level details for beaten/verified
        // const beatenByList = data.beatenByList || {}; // Assuming API structures it
        // const verifiedByList = data.verifiedByList || {}; // Assuming API structures it

        // Option 2: API returns only level IDs/names, process here (example)
        const beatenByList = {};
        const verifiedByList = {};
        const uniqueBeatenNames = new Set(); // Use Set for efficient duplicate checking

        // Process personal records (completions)
        data.user?.personalRecords?.forEach(record => {
            // Find details using static lists (assuming API only returns basic record info)
            const levelDetails = findLevelDetailsByName(record.levelName); // Use levelName stored on record
            if (levelDetails && !uniqueBeatenNames.has(levelDetails.name.toLowerCase())) {
                 if (!beatenByList[levelDetails.listType]) beatenByList[levelDetails.listType] = [];
                 beatenByList[levelDetails.listType].push(levelDetails);
                 uniqueBeatenNames.add(levelDetails.name.toLowerCase());
            } else if (!levelDetails) {
                console.warn(`Could not find static details for completed level: ${record.levelName}`);
            }
        });

        // Process verified levels (requires fetching levels verified by this user ID)
        // This logic might be better handled *within* the API endpoint itself.
        // For now, let's assume the API provides a `verifiedLevels` array.
        data.verifiedLevels?.forEach(verifiedLevel => {
             const levelDetails = findLevelDetailsByName(verifiedLevel.name); // Find listType etc.
             if (levelDetails) {
                if (!verifiedByList[levelDetails.listType]) verifiedByList[levelDetails.listType] = [];
                // Avoid duplicates if also present in beaten list (though should be handled by Set above ideally)
                if (!verifiedByList[levelDetails.listType].some(l => l.name === levelDetails.name)) {
                   verifiedByList[levelDetails.listType].push(levelDetails);
                }
             }
        });


        setPlayerData({
          name: data.user.username, // Get username from API response
          stats: stats, // Store the PlayerStat object
          beatenByList, // Processed beaten levels
          verifiedByList, // Processed verified levels
          hardestDemon: hardestDemonDetails, // Processed hardest demon
        });

      } catch (err) {
        console.error("Failed to load player data from API:", err);
        if (err.response?.status === 404) {
             setError(`Player "${playerName}" not found or has no stats.`);
        } else {
             setError("An error occurred while fetching player data.");
        }
        setPlayerData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerData();
  }, [playerName]); // Re-run effect if playerName changes

  if (loading) {
    return <LoadingSpinner message={t('loading_data')} />; // Use LoadingSpinner
  }

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

  // Destructure data for rendering
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
            {name}
          </h1>

          {/* Rank/Score from DB */}
          {stats ? (
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