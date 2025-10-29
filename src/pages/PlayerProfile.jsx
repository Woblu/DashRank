import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner'; // Assuming you have this

// Import static lists only for getting list titles and maybe details for linking if needed
// We rely on the API for the actual lists of completed/verified levels
import mainList from '../data/main-list.json';
import unratedList from '../data/unrated-list.json';
import platformerList from '../data/platformer-list.json';
import challengeList from '../data/challenge-list.json';
// futureList might not be needed if not displaying completions/verifications from it
// import futureList from '../data/future-list.json';

// Keep list titles for display
const listTitles = { main: "Main List", unrated: "Unrated List", platformer: "Platformer List", challenge: "Challenge List", future: "Future List" };

// Helper to find level details in static lists by name (case-insensitive)
// Needed for linking completed/verified levels fetched from API
const allStaticLists = { main: mainList, unrated: unratedList, platformer: platformerList, challenge: challengeList }; // Exclude future if not needed

const findLevelDetailsByName = (levelName) => {
    if (!levelName || levelName === 'N/A') return null;
    for (const listType of Object.keys(allStaticLists)) {
        const listData = allStaticLists[listType];
        // Ensure listData is an array before trying to find
        if (Array.isArray(listData)) {
            const level = listData.find(l => l.name?.toLowerCase() === levelName.toLowerCase());
            if (level) {
                // Return details including listType and ensuring levelName is correct case
                return { ...level, listType, levelName: level.name };
            }
        }
    }
    // Keep this warning commented unless actively debugging missing levels
    // console.warn(`[PlayerProfile] Level details not found for name: "${levelName}" in static lists.`);
    return null;
};


export default function PlayerProfile() {
  const { playerName } = useParams(); // Get player name from URL parameter
  const { t } = useLanguage();
  const location = useLocation();
  const [playerData, setPlayerData] = useState(null); // Will store combined data { name, stats, beatenByList, verifiedByList, hardestDemon }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // State for API errors

  const fromPath = location.state?.from || '/'; // Default back path

  useEffect(() => {
    const fetchPlayerData = async () => {
      if (!playerName) {
        setError("Player name not provided.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null); // Clear previous errors
      setPlayerData(null); // Clear previous data

      try {
        console.log(`[PlayerProfile] Fetching stats via API for: ${playerName}`);
        // Fetch data from the API endpoint
        const response = await axios.get(`/api/player-stats/${encodeURIComponent(playerName)}`);
        const apiData = response.data; // Expected: { playerStat, verifiedLevels, completedLevels }
        console.log("[PlayerProfile] Received API data:", apiData);

        // Check if essential data is missing, indicating player not found or no relevant data
        if (!apiData.playerStat && apiData.verifiedLevels?.length === 0 && apiData.completedLevels?.length === 0) {
            throw new Error(`Player "${playerName}" not found or has no stats/levels.`); // Trigger catch block
        }

        // --- Process data received from API ---

        // Player Name and Stats (Rank, Score, Hardest Name/Placement)
        const stats = apiData.playerStat; // Can be null or an object from Playerstats collection
        const displayName = stats?.name || playerName; // Use name from stats if available, fallback to URL param

        // Process Hardest Demon Details for Linking (using info from stats)
        let hardestDemonDetails = null;
        if (stats?.hardestDemonName) {
            // Attempt to find full details (like levelId, listType) using static lists for linking
             hardestDemonDetails = findLevelDetailsByName(stats.hardestDemonName);
             if (hardestDemonDetails) {
                 // Use the accurate placement from the stats object
                 hardestDemonDetails.placement = stats.hardestDemonPlacement ?? hardestDemonDetails.placement; // Prioritize placement from stats
                 console.log("[PlayerProfile] Found full details for hardest demon:", hardestDemonDetails);
             } else {
                 // If not found in static lists, create a placeholder for display
                 console.warn(`[PlayerProfile] Could not find static details for hardest demon "${stats.hardestDemonName}". Creating placeholder.`);
                 hardestDemonDetails = {
                     levelName: stats.hardestDemonName,
                     placement: stats.hardestDemonPlacement || '?',
                     listType: 'main', // Assume main list if details missing
                     id: null, // Indicate details are incomplete
                     levelId: null
                 };
             }
        } else {
             console.log("[PlayerProfile] No Hardest Demon info provided by API.");
        }


        // Group Completed Levels by List
        const beatenByList = {};
        const uniqueBeatenIdsOrNames = new Set(); // Use Set for efficient duplicate checking based on ID or name

        apiData.completedLevels?.forEach(level => {
            const levelIdentifier = level.id || level.name?.toLowerCase(); // Use ID if available, else name
            if (!levelIdentifier || uniqueBeatenIdsOrNames.has(levelIdentifier)) return; // Skip if no identifier or duplicate

            const listType = level.list || 'unknown'; // Use list field from level data
            if (!beatenByList[listType]) beatenByList[listType] = [];

            // Attempt to enrich with static data if needed (e.g., for levelId if missing)
             const staticDetails = findLevelDetailsByName(level.name);
             const displayLevel = {
                 ...staticDetails, // Include static details first (like levelId)
                 ...level, // Override with potentially more accurate DB data (like placement, name casing)
                 levelName: level.name, // Ensure levelName exists
                 listType: listType,
             };

            beatenByList[listType].push(displayLevel);
            uniqueBeatenIdsOrNames.add(levelIdentifier);
        });
        // Sort levels within each list by placement
        Object.values(beatenByList).forEach(list => list.sort((a, b) => (a.placement || Infinity) - (b.placement || Infinity)));
        console.log("[PlayerProfile] Grouped Completed Levels:", beatenByList);


        // Group Verified Levels by List
        const verifiedByList = {};
        const uniqueVerifiedIdsOrNames = new Set();
        apiData.verifiedLevels?.forEach(level => {
             const levelIdentifier = level.id || level.name?.toLowerCase();
             if (!levelIdentifier || uniqueVerifiedIdsOrNames.has(levelIdentifier)) return;

            const listType = level.list || 'unknown';
            if (!verifiedByList[listType]) verifiedByList[listType] = [];

            // Enrich with static data if needed
             const staticDetails = findLevelDetailsByName(level.name);
             const displayLevel = {
                 ...staticDetails,
                 ...level,
                 levelName: level.name,
                 listType: listType,
             };

            verifiedByList[listType].push(displayLevel);
            uniqueVerifiedIdsOrNames.add(levelIdentifier);
        });
         // Sort levels within each list by placement
        Object.values(verifiedByList).forEach(list => list.sort((a, b) => (a.placement || Infinity) - (b.placement || Infinity)));
        console.log("[PlayerProfile] Grouped Verified Levels:", verifiedByList);


        // Set the final state object used for rendering
        setPlayerData({
          name: displayName,
          stats: stats, // Store the whole stats object (rank, score, hardest info from DB)
          beatenByList, // Grouped and sorted completed levels
          verifiedByList, // Grouped and sorted verified levels
          hardestDemon: hardestDemonDetails, // Store processed hardest demon details for display
        });

      } catch (err) {
        console.error("Failed to load player data:", err);
        // Use error message from API (e.g., 404) or catch block
        setError(err.response?.data?.message || err.message || "An error occurred fetching player data.");
        setPlayerData(null); // Ensure data is null on error
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerData();
  }, [playerName]); // Re-run effect only if playerName in URL changes

  // Render Loading state
  if (loading) {
    return <LoadingSpinner message={t('loading_data')} />;
  }

  // Render Error or Not Found state
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

  // Destructure data for easier access in JSX, stats might be null
  const { name, stats, beatenByList, verifiedByList, hardestDemon } = playerData;

  // Calculate total counts for summary display
  const totalCompleted = Object.values(beatenByList).reduce((sum, list) => sum + list.length, 0);
  const totalVerified = Object.values(verifiedByList).reduce((sum, list) => sum + list.length, 0);


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
            {name} {/* Display name */}
          </h1>

          {/* Rank/Score */}
          {stats ? ( // Check if stats object from DB exists
            <div className="text-center mb-4 text-gray-800 dark:text-gray-200">
              <p>
                  <span className="font-semibold">{t('demonlist_rank')}:</span>{' '}
                  {/* Display rank from stats, fallback to N/A */}
                  {stats.demonlistRank !== null ? `#${stats.demonlistRank}` : t('na')}
              </p>
              <p>
                  <span className="font-semibold">{t('demonlist_score')}:</span>{' '}
                  {/* Display score from stats, fallback to N/A */}
                  {stats.demonlistScore !== null ? stats.demonlistScore.toFixed(2) : t('na')}
              </p>
            </div>
          ) : (
             <div className="text-center mb-4 text-gray-500 dark:text-gray-400">
                <p>Not ranked on the main list.</p> {/* Message if no playerstats entry */}
             </div>
          )}

          {/* Stats Summary Section */}
          <div className="text-center border-t border-gray-300 dark:border-gray-600 pt-4 space-y-2 text-gray-800 dark:text-gray-200">
            {/* Hardest Demon Display */}
            {hardestDemon && hardestDemon.levelName ? ( // Check if hardestDemon object has a name
              <p>
                <span className="font-semibold">{t('hardest_demon')}:</span>{' '}
                {/* Use levelId (GD ID) or id (Prisma ID) for link if available */}
                {(hardestDemon.levelId || hardestDemon.id) ? (
                     <Link to={`/level/${hardestDemon.listType}/${hardestDemon.levelId || hardestDemon.id}`} className="text-cyan-600 dark:text-cyan-400 hover:underline">
                       {hardestDemon.levelName} (#{hardestDemon.placement})
                     </Link>
                ) : (
                    // Display name and placement even if not linkable
                    <span>{hardestDemon.levelName} (#{hardestDemon.placement || '?'})</span>
                )}
              </p>
            ) : (
              // Show N/A only if hardestDemon calculation failed or no main list completions
              <p><span className="font-semibold">{t('hardest_demon')}:</span> {t('na')}</p>
            )}

            {/* Total Counts */}
             {totalCompleted > 0 && (
                <p>
                    <span className="font-semibold">{t('total_completed')}:</span> {totalCompleted}
                </p>
             )}
             {totalVerified > 0 && (
                <p>
                    <span className="font-semibold">{t('total_verified')}:</span> {totalVerified}
                </p>
             )}
              {/* You can add counts per list here if desired, iterating over beatenByList/verifiedByList */}
          </div>
        </div>

        {/* --- Completed Demons Sections --- */}
        {/* Sort sections by a predefined order or alphabetically */}
        {Object.entries(beatenByList).sort(([listA], [listB]) => (listTitles[listA] || listA).localeCompare(listTitles[listB] || listB))
            .map(([listType, levels]) => (
            // Only render section if there are levels in this list
            levels.length > 0 && (
                <div key={`beaten-section-${listType}`} className="bg-gray-100 dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-bold text-center text-cyan-600 dark:text-cyan-400 mb-4">
                        {listTitles[listType] || listType} {t('completed_demons')}
                    </h2>
                    <div className="text-center text-gray-700 dark:text-gray-300 leading-relaxed break-words">
                        {/* Levels are pre-sorted by placement */}
                        {levels.map((level, index) => (
                        <React.Fragment key={`${level.id || level.name}-beaten-${index}`}>
                            {/* Use levelId (GD ID) or id (Prisma ID) for link */}
                            {(level.levelId || level.id) ? (
                                <Link to={`/level/${listType}/${level.levelId || level.id}`} className="text-cyan-600 dark:text-cyan-400 hover:underline">
                                {level.levelName}
                                </Link>
                            ) : (
                                // Fallback if no ID available
                                <span>{level.levelName}</span>
                            )}
                            {index < levels.length - 1 && ' - '}
                        </React.Fragment>
                        ))}
                    </div>
                </div>
            )
        ))}

        {/* --- Verified Demons Sections --- */}
        {Object.entries(verifiedByList).sort(([listA], [listB]) => (listTitles[listA] || listA).localeCompare(listTitles[listB] || listB)) // Sort sections
            .map(([listType, levels]) => (
            // Only render section if there are levels in this list
            levels.length > 0 && (
                <div key={`verified-section-${listType}`} className="bg-gray-100 dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-bold text-center text-cyan-600 dark:text-cyan-400 mb-4">
                        {listTitles[listType] || listType} {t('verified_demons')}
                    </h2>
                    <div className="text-center text-gray-700 dark:text-gray-300 leading-relaxed break-words">
                         {/* Levels are pre-sorted by placement */}
                        {levels.map((level, index) => (
                            <React.Fragment key={`${level.id || level.name}-verified-${index}`}>
                                {(level.levelId || level.id) ? (
                                    <Link to={`/level/${listType}/${level.levelId || level.id}`} className="text-cyan-600 dark:text-cyan-400 hover:underline">
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

// Minimal LoadingSpinner component (ensure this exists or is imported correctly)
// const LoadingSpinner = ({ message }) => <div className="text-center p-8 text-gray-800 dark:text-gray-200">{message || 'Loading...'}</div>;