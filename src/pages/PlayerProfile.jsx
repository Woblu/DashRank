import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner'; // Assuming you have this component

// Import ALL static lists needed to find completions and verifications
import mainList from '../data/main-list.json';
import unratedList from '../data/unrated-list.json';
import platformerList from '../data/platformer-list.json';
import challengeList from '../data/challenge-list.json';
// Import future list if verifications/completions from there should be shown
// import futureList from '../data/future-list.json';

// Combine static lists for easier iteration
const allStaticLists = {
    main: mainList,
    unrated: unratedList,
    platformer: platformerList,
    challenge: challengeList,
    // future: futureList // Add if needed
};
// Keep list titles for display
const listTitles = { main: "Main List", unrated: "Unrated List", platformer: "Platformer List", challenge: "Challenge List", future: "Future List" };

// Helper to find level details in static lists by name (case-insensitive)
// Needed for linking the hardest demon and potentially enriching list displays
const findLevelDetailsByName = (levelName) => {
    if (!levelName || levelName === 'N/A') return null;
    for (const listType of Object.keys(allStaticLists)) {
        const listData = allStaticLists[listType];
        // Ensure listData is an array before trying to find
        if (Array.isArray(listData)) {
            const level = listData.find(l => l.name?.toLowerCase() === levelName.toLowerCase());
            if (level) {
                // Return details needed for linking (name, id/levelId, listType)
                return {
                    name: level.name, // Use canonical name from static file
                    id: level.id, // Use Prisma ID if available in JSON
                    levelId: level.levelId, // Use GD Level ID if available in JSON
                    listType: listType, // Add the list type
                    // Include placement from static file as a fallback if needed elsewhere
                    // staticPlacement: level.placement
                 };
            }
        }
    }
    console.warn(`[PlayerProfile Helper] Level details not found for name: "${levelName}" in static lists.`);
    return null; // Return null if not found
};


export default function PlayerProfile() {
  const { playerName } = useParams();
  const { t } = useLanguage();
  const location = useLocation();
  // State holds data combined from API (stats) and static files (lists)
  const [profileData, setProfileData] = useState({
      name: playerName, // Default to param name
      stats: null, // Will hold { name, rank, score, hardestName, hardestPlacement } from API
      beatenByList: {}, // Will hold levels completed but not verified, grouped by list
      verifiedByList: {}, // Will hold levels verified, grouped by list
      hardestDemonDisplay: null, // Will hold processed hardest demon object for rendering
      loading: true,
      error: null,
  });

  const fromPath = location.state?.from || '/'; // Default back path

  useEffect(() => {
    const fetchAndProcessData = async () => {
      // Ensure playerName is provided
      if (!playerName) {
        setProfileData(prev => ({ ...prev, error: "Player name missing.", loading: false }));
        return;
      }

      // Reset state for a new player load
      setProfileData(prev => ({
          name: playerName, stats: null, beatenByList: {}, verifiedByList: {},
          hardestDemonDisplay: null, loading: true, error: null
      }));

      let apiStats = null;
      let apiError = null;

      // --- 1. Fetch Core Stats (Rank, Score, Hardest) from API ---
      try {
        console.log(`[PlayerProfile v4] Fetching core stats via API for: ${playerName}`);
        const response = await axios.get(`/api/player-stats/${encodeURIComponent(playerName)}`);
        apiStats = response.data.playerStat; // Expected: { name, demonlistRank, demonlistScore, hardestDemonName, hardestDemonPlacement, ... }
        console.log("[PlayerProfile v4] Received API stats data:", apiStats);
        if (!apiStats) {
             console.log("[PlayerProfile v4] API returned no playerStat data (player might not be ranked).");
        }
      } catch (err) {
        console.error("Failed to load player stats from API:", err);
        if (err.response?.status !== 404) { // Ignore 404 if we might find static data
            apiError = err.response?.data?.message || err.message || "Error fetching core stats.";
        } else {
             console.log("[PlayerProfile v4] API returned 404 for player stats (expected if not ranked).");
        }
        apiStats = null; // Ensure stats are null on error/404
      }

      // Determine the canonical player name (prefer API result for correct casing)
      const canonicalName = apiStats?.name || playerName;
      const canonicalNameLower = canonicalName.toLowerCase();
      console.log(`[PlayerProfile v4] Using canonical name: ${canonicalName}`);


      // --- 2. Process Static JSONs Separately for Verified and Completed Lists ---
      const tempVerifiedByList = {};
      const tempBeatenByList = {};
      const verifiedLevelNames = new Set(); // Keep track of verified level names to avoid duplication

      console.log("[PlayerProfile v4] Processing static lists for VERIFIED levels...");
      for (const listType in allStaticLists) {
          const staticLevels = allStaticLists[listType];
          if (!Array.isArray(staticLevels)) continue; // Skip if data is not an array

          for (const level of staticLevels) {
              // Check verification using canonical name (case-insensitive)
              if (level.verifier?.toLowerCase() === canonicalNameLower) {
                  const levelNameLower = level.name?.toLowerCase();
                  if (!levelNameLower) continue; // Skip levels without names

                  if (!tempVerifiedByList[listType]) tempVerifiedByList[listType] = [];
                   // Add only if not already added
                  if (!tempVerifiedByList[listType].some(l => l.name?.toLowerCase() === levelNameLower)) {
                      // Add level details needed for display and linking
                      tempVerifiedByList[listType].push({
                          name: level.name,
                          id: level.id, // Prisma ID from JSON
                          levelId: level.levelId, // GD ID from JSON
                          placement: level.placement, // Placement from JSON
                          listType: listType,
                          levelName: level.name // Ensure levelName prop exists
                       });
                      verifiedLevelNames.add(levelNameLower); // Add to verified set
                  }
              }
          }
      }

      console.log("[PlayerProfile v4] Processing static lists for COMPLETED levels...");
       for (const listType in allStaticLists) {
          const staticLevels = allStaticLists[listType];
          if (!Array.isArray(staticLevels)) continue;

           for (const level of staticLevels) {
               const levelNameLower = level.name?.toLowerCase();
               if (!levelNameLower) continue;

               // Check completions from records array (case-insensitive)
               let isCompleted = false;
               if (Array.isArray(level.records)) {
                    if(level.records.some(r => r.username?.toLowerCase() === canonicalNameLower && r.percent === 100)) {
                        isCompleted = true;
                    }
               }

               // Add to completed list ONLY if completed AND NOT verified by this player
               if (isCompleted && !verifiedLevelNames.has(levelNameLower)) {
                   if (!tempBeatenByList[listType]) tempBeatenByList[listType] = [];
                   // Add only if not already added to the beaten list
                   if (!tempBeatenByList[listType].some(l => l.name?.toLowerCase() === levelNameLower)) {
                        // Add level details needed for display and linking
                        tempBeatenByList[listType].push({
                          name: level.name,
                          id: level.id,
                          levelId: level.levelId,
                          placement: level.placement,
                          listType: listType,
                          levelName: level.name
                       });
                   }
               }
           }
       }

      // Sort levels within each list by placement (using placement from static JSON)
      Object.values(tempBeatenByList).forEach(list => list.sort((a, b) => (a.placement || Infinity) - (b.placement || Infinity)));
      Object.values(tempVerifiedByList).forEach(list => list.sort((a, b) => (a.placement || Infinity) - (b.placement || Infinity)));
      console.log("[PlayerProfile v4] Grouped Completed Levels:", tempBeatenByList);
      console.log("[PlayerProfile v4] Grouped Verified Levels:", tempVerifiedByList);

      // --- 3. Process Hardest Demon for Display ---
      // Use the name/placement primarily from the API stats object
      let hardestDemonDisplayData = null;
      if (apiStats?.hardestDemonName) {
           console.log(`[PlayerProfile v4] Using hardest demon from API: ${apiStats.hardestDemonName} (#${apiStats.hardestDemonPlacement})`);
           // Find details (like levelId, listType) using the static files helper for linking
           const detailsFromStatic = findLevelDetailsByName(apiStats.hardestDemonName);

           hardestDemonDisplayData = {
                levelName: apiStats.hardestDemonName, // Name from API
                placement: apiStats.hardestDemonPlacement, // **Placement from API**
                // Use details from static file for linking if found
                listType: detailsFromStatic?.listType || 'main', // Default to main if not found
                id: detailsFromStatic?.id || null,
                levelId: detailsFromStatic?.levelId || null,
           };
           console.log("[PlayerProfile v4] Final hardest demon details for display:", hardestDemonDisplayData);

      } else {
           console.log("[PlayerProfile v4] No Hardest Demon info from API.");
           // Optional Fallback: Calculate from static lists ONLY if API fails?
           // let calculatedHardest = null; /* ... find hardest from tempBeaten/tempVerified ... */
           // if (calculatedHardest) hardestDemonDisplayData = calculatedHardest;
      }


      // --- 4. Final Check and Set State ---
       // Check if we found *any* data (stats OR completions OR verifications)
       if (!apiStats && Object.keys(tempBeatenByList).length === 0 && Object.keys(tempVerifiedByList).length === 0) {
           setError(`Player "${playerName}" not found or has no associated data.`);
           setProfileData(prev => ({ ...prev, loading: false, error: `Player "${playerName}" not found or has no associated data.` })); // Set error in state
       } else {
           // Set the final state
           setProfileData({
               name: canonicalName,
               stats: apiStats, // The object from Playerstats DB (rank, score, hardestName, hardestPlacement)
               beatenByList: tempBeatenByList, // Calculated from static JSONs (excluding verified)
               verifiedByList: tempVerifiedByList, // Calculated from static JSONs
               hardestDemonDisplay: hardestDemonDisplayData, // Processed object for display (using API placement)
               loading: false,
               error: apiError, // Store potential API error
           });
       }

    }; // End fetchAndProcessData

    fetchAndProcessData();
  }, [playerName]); // Re-run effect only if playerName in URL changes

  // --- Render Logic ---
  if (profileData.loading) {
      return <LoadingSpinner message={t('loading_data')} />;
  }

  // Render Error state (show full error only if no data at all was found)
  if (profileData.error && !profileData.stats && Object.keys(profileData.beatenByList).length === 0 && Object.keys(profileData.verifiedByList).length === 0) {
      return (
          <div className="text-center p-8">
              <h1 className="text-2xl font-bold text-red-500">{profileData.error}</h1>
              <Link to={fromPath} className="mt-4 inline-flex items-center text-cyan-600 dark:text-cyan-400 hover:underline">
                  <ChevronLeft size={16} /> {t('back_to_home')}
              </Link>
          </div>
      );
  }

  // Destructure data for easier access in JSX
  // Note: stats might be null if API failed or player not ranked
  const { name, stats, beatenByList, verifiedByList, hardestDemonDisplay } = profileData;

  // Calculate total counts
  const totalCompleted = Object.values(beatenByList).reduce((sum, list) => sum + list.length, 0);
  const totalVerified = Object.values(verifiedByList).reduce((sum, list) => sum + list.length, 0);


  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Back Link */}
      <Link to={fromPath} className="mb-4 inline-flex items-center text-cyan-600 dark:text-cyan-400 hover:underline">
        <ChevronLeft size={20} />
        {t('back_to_home')}
      </Link>

      {/* Display API error as a warning if we still have static data */}
       {profileData.error && <div className="p-4 mb-4 text-sm text-yellow-700 bg-yellow-100 rounded-lg dark:bg-yellow-200 dark:text-yellow-800" role="alert">
          <span className="font-medium">Warning!</span> Could not fetch latest rank/score from server: {profileData.error}. Displaying potentially outdated info.
        </div>}


      <div className="space-y-6">
        {/* Main Info Box */}
        <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          {/* Player Name */}
          <h1 className="font-poppins text-4xl font-bold text-cyan-600 dark:text-cyan-400 mb-4 text-center">
            {name} {/* Display name */}
          </h1>

          {/* Rank/Score */}
          {stats ? ( // Check if stats object from API exists
            <div className="text-center mb-4 text-gray-800 dark:text-gray-200">
              <p><span className="font-semibold">{t('demonlist_rank')}:</span> {stats.demonlistRank !== null ? `#${stats.demonlistRank}` : t('na')}</p>
              <p><span className="font-semibold">{t('demonlist_score')}:</span> {stats.demonlistScore !== null ? stats.demonlistScore.toFixed(2) : t('na')}</p>
            </div>
          ) : (
             <div className="text-center mb-4 text-gray-500 dark:text-gray-400">
                <p>Not ranked on the main list.</p> {/* Message if no playerstats entry */}
             </div>
          )}

          {/* Stats Summary Section */}
          <div className="text-center border-t border-gray-300 dark:border-gray-600 pt-4 space-y-2 text-gray-800 dark:text-gray-200">
            {/* Hardest Demon Display - Uses hardestDemonDisplay state */}
            {hardestDemonDisplay && hardestDemonDisplay.levelName ? (
              <p>
                <span className="font-semibold">{t('hardest_demon')}:</span>{' '}
                {/* Link uses details (id/levelId, listType) found via helper */}
                {(hardestDemonDisplay.levelId || hardestDemonDisplay.id) ? (
                     <Link to={`/level/${hardestDemonDisplay.listType}/${hardestDemonDisplay.levelId || hardestDemonDisplay.id}`} className="text-cyan-600 dark:text-cyan-400 hover:underline">
                       {hardestDemonDisplay.levelName} (#{hardestDemonDisplay.placement}) {/* Use placement from state */}
                     </Link>
                ) : (
                    // Display name and placement even if not linkable
                    <span>{hardestDemonDisplay.levelName} (#{hardestDemonDisplay.placement || '?'})</span>
                )}
              </p>
            ) : (
              // Show N/A if API didn't provide hardest OR if calculated fallback failed
              <p><span className="font-semibold">{t('hardest_demon')}:</span> {t('na')}</p>
            )}

            {/* Counts - Calculated from static JSON processing */}
             {totalCompleted > 0 && (
                <p><span className="font-semibold">{t('total_completed')}:</span> {totalCompleted}</p>
             )}
             {totalVerified > 0 && (
                <p><span className="font-semibold">{t('total_verified')}:</span> {totalVerified}</p>
             )}
          </div>
        </div>

        {/* --- Completed Demons Sections --- */}
        {/* Iterate over beatenByList, which now excludes verified levels */}
        {Object.entries(beatenByList).sort(([listA], [listB]) => (listTitles[listA] || listA).localeCompare(listTitles[listB] || listB))
            .map(([listType, levels]) => (
            levels.length > 0 && (
                <div key={`beaten-section-${listType}`} className="bg-gray-100 dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-bold text-center text-cyan-600 dark:text-cyan-400 mb-4">
                        {listTitles[listType] || listType} {t('completed_demons')}
                    </h2>
                    <div className="text-center text-gray-700 dark:text-gray-300 leading-relaxed break-words">
                        {/* Levels are pre-sorted */}
                        {levels.map((level, index) => (
                        <React.Fragment key={`${level.id || level.name}-beaten-${index}`}>
                            {(level.levelId || level.id) ? (
                                <Link to={`/level/${listType}/${level.levelId || level.id}`} className="text-cyan-600 dark:text-cyan-400 hover:underline">
                                {level.levelName}
                                </Link>
                            ) : ( <span>{level.levelName}</span> )}
                            {index < levels.length - 1 && ' - '}
                        </React.Fragment>
                        ))}
                    </div>
                </div>
            )
        ))}

        {/* --- Verified Demons Sections --- */}
        {/* Iterate over verifiedByList */}
        {Object.entries(verifiedByList).sort(([listA], [listB]) => (listTitles[listA] || listA).localeCompare(listTitles[listB] || listB))
            .map(([listType, levels]) => (
            levels.length > 0 && (
                <div key={`verified-section-${listType}`} className="bg-gray-100 dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-bold text-center text-cyan-600 dark:text-cyan-400 mb-4">
                        {listTitles[listType] || listType} {t('verified_demons')}
                    </h2>
                    <div className="text-center text-gray-700 dark:text-gray-300 leading-relaxed break-words">
                         {/* Levels are pre-sorted */}
                        {levels.map((level, index) => (
                            <React.Fragment key={`${level.id || level.name}-verified-${index}`}>
                                {(level.levelId || level.id) ? (
                                    <Link to={`/level/${listType}/${level.levelId || level.id}`} className="text-cyan-600 dark:text-cyan-400 hover:underline">
                                        {level.levelName}
                                    </Link>
                                ) : ( <span>{level.levelName}</span> )}
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

// Ensure LoadingSpinner component exists and is imported correctly
// const LoadingSpinner = ({ message }) => <div className="text-center p-8 text-gray-800 dark:text-gray-200">{message || 'Loading...'}</div>;