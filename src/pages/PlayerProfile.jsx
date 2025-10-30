import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner';

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
const listTitles = { main: "Main List", unrated: "Unrated List", platformer: "Platformer List", challenge: "Challenge List", future: "Future List" };

// Helper to find level details in static lists by name (case-insensitive)
// Still useful for linking the hardest demon
const findLevelDetailsByName = (levelName) => {
    if (!levelName || levelName === 'N/A') return null;
    for (const listType of Object.keys(allStaticLists)) {
        const listData = allStaticLists[listType];
        if (Array.isArray(listData)) {
            const level = listData.find(l => l.name?.toLowerCase() === levelName.toLowerCase());
            if (level) {
                // Return details needed for linking
                return { ...level, listType, levelName: level.name };
            }
        }
    }
    console.warn(`[PlayerProfile Helper] Level details not found for name: "${levelName}" in static lists.`);
    return null;
};


export default function PlayerProfile() {
  const { playerName } = useParams();
  const { t } = useLanguage();
  const location = useLocation();
  // State holds data combined from API (stats) and static files (lists)
  const [profileData, setProfileData] = useState({
      name: playerName, // Default to param name
      stats: null,
      beatenByList: {},
      verifiedByList: {},
      hardestDemon: null,
      loading: true,
      error: null,
  });

  const fromPath = location.state?.from || '/';

  useEffect(() => {
    const fetchAndProcessData = async () => {
      if (!playerName) {
        setProfileData(prev => ({ ...prev, error: "Player name missing.", loading: false }));
        return;
      }

      setProfileData(prev => ({ // Reset state for new load
          name: playerName, stats: null, beatenByList: {}, verifiedByList: {},
          hardestDemon: null, loading: true, error: null
      }));

      let apiStats = null;
      let apiError = null;

      // --- 1. Fetch Core Stats from API ---
      try {
        console.log(`[PlayerProfile] Fetching core stats via API for: ${playerName}`);
        const response = await axios.get(`/api/player-stats/${encodeURIComponent(playerName)}`);
        // We only care about playerStat from the API response now
        apiStats = response.data.playerStat; // { name, demonlistRank, demonlistScore, hardestDemonName, hardestDemonPlacement, ... }
        console.log("[PlayerProfile] Received API stats data:", apiStats);
        if (!apiStats) {
             console.log("[PlayerProfile] API returned no playerStat data for main list.");
             // Don't set error yet, player might still have completions/verifications
        }
      } catch (err) {
        console.error("Failed to load player stats from API:", err);
        // If API returns 404, it's okay if we find completions/verifications in static files
        if (err.response?.status !== 404) {
            apiError = err.response?.data?.message || err.message || "Error fetching core stats.";
        } else {
             console.log("[PlayerProfile] API returned 404 for player stats (expected if not ranked).");
        }
        apiStats = null; // Ensure stats are null on error/404
      }

      // Determine the canonical player name (prefer API result for correct casing)
      const canonicalName = apiStats?.name || playerName;
      const canonicalNameLower = canonicalName.toLowerCase();
      console.log(`[PlayerProfile] Using canonical name: ${canonicalName}`);


      // --- 2. Process Static JSONs for Completed/Verified Lists ---
      const beatenByList = {};
      const verifiedByList = {};
      const uniqueBeatenOrVerifiedNames = new Set(); // Track unique level names processed

      console.log("[PlayerProfile] Processing static lists for completions/verifications...");
      for (const listType in allStaticLists) {
          const staticLevels = allStaticLists[listType];
          if (!Array.isArray(staticLevels)) continue;

          for (const level of staticLevels) {
              const levelNameLower = level.name?.toLowerCase();
              if (!levelNameLower) continue; // Skip levels without names

              let isVerified = false;
              let isCompleted = false;

              // Check verification (case-insensitive)
              if (level.verifier?.toLowerCase() === canonicalNameLower) {
                  isVerified = true;
                   console.log(` -> Found verified: ${level.name} (${listType})`);
                  if (!verifiedByList[listType]) verifiedByList[listType] = [];
                  // Add only if not already added (handles potential duplicates in source)
                  if (!verifiedByList[listType].some(l => l.name?.toLowerCase() === levelNameLower)) {
                      verifiedByList[listType].push({ ...level, listType, levelName: level.name });
                  }
              }

              // Check completions from records array (case-insensitive)
              if (Array.isArray(level.records)) {
                    if(level.records.some(r => r.username?.toLowerCase() === canonicalNameLower && r.percent === 100)) {
                        isCompleted = true;
                    }
              }

              // Add to completed list if completed OR verified (ensures verified levels appear)
              // and if not already processed
              if ((isCompleted || isVerified) && !uniqueBeatenOrVerifiedNames.has(levelNameLower)) {
                   console.log(` -> Found completed/verified: ${level.name} (${listType})`);
                  if (!beatenByList[listType]) beatenByList[listType] = [];
                  beatenByList[listType].push({ ...level, listType, levelName: level.name });
                  uniqueBeatenOrVerifiedNames.add(levelNameLower);
              }
          }
      }
      // Sort levels within each list by placement
      Object.values(beatenByList).forEach(list => list.sort((a, b) => (a.placement || Infinity) - (b.placement || Infinity)));
      Object.values(verifiedByList).forEach(list => list.sort((a, b) => (a.placement || Infinity) - (b.placement || Infinity)));
      console.log("[PlayerProfile] Grouped Completed Levels (from static):", beatenByList);
      console.log("[PlayerProfile] Grouped Verified Levels (from static):", verifiedByList);

      // --- 3. Process Hardest Demon ---
      // Use the name/placement from the API stats if available
      let hardestDemonDetails = null;
      if (apiStats?.hardestDemonName) {
           console.log(`[PlayerProfile] Using hardest demon from API: ${apiStats.hardestDemonName} (#${apiStats.hardestDemonPlacement})`);
           // Find details for linking using the helper
           hardestDemonDetails = findLevelDetailsByName(apiStats.hardestDemonName);
           if (hardestDemonDetails) {
                // Ensure placement matches the reliable API data
                hardestDemonDetails.placement = apiStats.hardestDemonPlacement ?? hardestDemonDetails.placement;
           } else {
                // Fallback if details lookup fails
                hardestDemonDetails = { levelName: apiStats.hardestDemonName, placement: apiStats.hardestDemonPlacement || '?', listType: 'main', id: null, levelId: null };
           }
      } else {
           console.log("[PlayerProfile] No hardest demon info from API.");
           // Optional: Calculate hardest dynamically ONLY IF API fails? (Adds complexity back)
           // For now, if API says null, we show N/A.
      }
       console.log("[PlayerProfile] Final Hardest Demon for display:", hardestDemonDetails);


      // --- 4. Final Check and Set State ---
       // Check if we found *any* data (stats OR completions OR verifications)
       if (!apiStats && Object.keys(beatenByList).length === 0 && Object.keys(verifiedByList).length === 0) {
           // If API failed AND we found nothing in static files, then player not found
           setError(`Player "${playerName}" not found or has no associated data.`);
           setProfileData(prev => ({ ...prev, loading: false }));
       } else {
           // Set the final state with combined data
           setProfileData({
               name: canonicalName,
               stats: apiStats, // Store the stats object from API (can be null)
               beatenByList: beatenByList, // From static JSONs
               verifiedByList: verifiedByList, // From static JSONs
               hardestDemon: hardestDemonDetails, // From API stats, processed for linking
               loading: false,
               error: apiError, // Store potential API error, but still show static data
           });
       }

    }; // End fetchAndProcessData

    fetchAndProcessData();
  }, [playerName]); // Re-run effect if playerName in URL changes

  // Render Loading state
  if (profileData.loading) {
    return <LoadingSpinner message={t('loading_data')} />;
  }

  // Render Error state (only show full error if we have NO data at all)
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
  const { name, stats, beatenByList, verifiedByList, hardestDemon } = profileData;

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

      {/* Display API error as a warning if we still have static data to show */}
       {profileData.error && <div className="p-4 mb-4 text-sm text-yellow-700 bg-yellow-100 rounded-lg dark:bg-yellow-200 dark:text-yellow-800" role="alert">
          <span className="font-medium">Warning!</span> Could not fetch latest rank/score from server: {profileData.error} Displaying static data.
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
            {/* Hardest Demon Display - Uses hardestDemon state derived from API stats */}
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
        {Object.entries(beatenByList).sort(([listA], [listB]) => (listTitles[listA] || listA).localeCompare(listTitles[listB] || listB))
            .map(([listType, levels]) => (
            levels.length > 0 && (
                <div key={`beaten-section-${listType}`} className="bg-gray-100 dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-bold text-center text-cyan-600 dark:text-cyan-400 mb-4">
                        {listTitles[listType] || listType} {t('completed_demons')}
                    </h2>
                    <div className="text-center text-gray-700 dark:text-gray-300 leading-relaxed break-words">
                        {/* Levels are pre-sorted by placement */}
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
        {Object.entries(verifiedByList).sort(([listA], [listB]) => (listTitles[listA] || listA).localeCompare(listTitles[listB] || listB))
            .map(([listType, levels]) => (
            levels.length > 0 && (
                <div key={`verified-section-${listType}`} className="bg-gray-100 dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-bold text-center text-cyan-600 dark:text-cyan-400 mb-4">
                        {listTitles[listType] || listType} {t('verified_demons')}
                    </h2>
                    <div className="text-center text-gray-700 dark:text-gray-300 leading-relaxed break-words">
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