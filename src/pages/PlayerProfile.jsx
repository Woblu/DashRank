// src/pages/PlayerProfile.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext.jsx';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner'; 
import { cleanUsername } from '../utils/scoring.js'; 

// [FIX] Removed all static list imports (mainList, unratedList, etc.)

// Keep list titles for display
const listTitles = { main: "Main List", unrated: "Unrated List", platformer: "Platformer List", challenge: "Challenge List", future: "Future List" };

export default function PlayerProfile() {
  const { playerName } = useParams();
  const { t } = useLanguage();
  const location = useLocation();
  
  // Clean the name from the URL to use for the API call
  const cleanPlayerName = cleanUsername(playerName.replace(/-/g, ' ')); 

  const [profileData, setProfileData] = useState({
      name: cleanPlayerName,
      stats: null,
      beatenByList: {},
      verifiedByList: {},
      hardestDemonDisplay: null,
      loading: true,
      error: null,
  });

  const fromPath = location.state?.from || '/';

  useEffect(() => {
    const fetchAndProcessData = async () => {
      if (!cleanPlayerName) {
        setProfileData(prev => ({ ...prev, error: "Player name missing.", loading: false }));
        return;
      }

      setProfileData(prev => ({
          name: cleanPlayerName, stats: null, beatenByList: {}, verifiedByList: {},
          hardestDemonDisplay: null, loading: true, error: null
      }));

      let apiData = null;
      let apiError = null;

      // --- 1. Fetch ALL Data from our new API ---
      try {
        console.log(`[PlayerProfile v9] Fetching all stats from API for: ${cleanPlayerName}`);
        const response = await axios.get(`/api/player-stats/${encodeURIComponent(cleanPlayerName)}`);
        apiData = response.data; // This now contains { playerStat, beatenByList, verifiedByList, hardestDemonDisplay }
        console.log("[PlayerProfile v9] Received all data from API:", apiData);
        if (!apiData || !apiData.playerStat) {
             console.log("[PlayerProfile v9] API returned no playerStat data.");
             apiError = "No player data found.";
        }
      } catch (err) {
        console.error("Failed to load player stats from API:", err);
        apiError = err.response?.data?.message || err.message || "Error fetching core stats.";
        apiData = null;
      }

      // --- 2. Set State ---
      if (!apiData) {
           setProfileData(prev => ({ ...prev, loading: false, error: apiError || `Player "${cleanPlayerName}" not found.` }));
      } else {
           setProfileData({
               name: apiData.playerStat.name, // Use the proper-cased name from the API
               stats: apiData.playerStat,
               beatenByList: apiData.beatenByList || {},
               verifiedByList: apiData.verifiedByList || {},
               hardestDemonDisplay: apiData.hardestDemonDisplay || null,
               loading: false,
               error: null, // Clear error if data is found
           });
      }
    }; // End fetchAndProcessData

    fetchAndProcessData();
  }, [cleanPlayerName, t]); // Re-run effect if the cleanPlayerName changes

  // --- Render Logic ---
  if (profileData.loading) {
      return <LoadingSpinner message={t('loading_data')} />;
  }

  // Render Error state
  if (profileData.error) {
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
  const { name, stats, beatenByList, verifiedByList, hardestDemonDisplay } = profileData;

  // Calculate total counts
  const totalCompleted = Object.values(beatenByList).reduce((sum, list) => sum + list.length, 0);
  const totalVerified = Object.values(verifiedByList).reduce((sum, list) => sum + list.length, 0);


  return (
    <div className="p-4 max-w-4xl mx-auto">
      <Link to={fromPath} className="mb-4 inline-flex items-center text-cyan-600 dark:text-cyan-400 hover:underline">
        <ChevronLeft size={20} />
        {t('back_to_home')}
      </Link>

      {/* removed the 'profileData.error' warning div, as it's now handled by the main error state */}
      
      <div className="space-y-6">
        <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <h1 className="font-poppins text-4xl font-bold text-cyan-600 dark:text-cyan-400 mb-4 text-center">
            {name}
          </h1>

          {stats ? (
            <div className="text-center mb-4 text-gray-800 dark:text-gray-200">
              <p><span className="font-semibold">{t('demonlist_rank')}:</span> {stats.demonlistRank !== null ? `#${stats.demonlistRank}` : t('na')}</p>
              <p><span className="font-semibold">{t('demonlist_score')}:</span> {stats.demonlistScore !== null ? stats.demonlistScore.toFixed(2) : t('na')}</p>
            </div>
          ) : (
             <div className="text-center mb-4 text-gray-500 dark:text-gray-400">
                <p>Not ranked on the main list.</p>
             </div>
          )}

          <div className="text-center border-t border-gray-300 dark:border-gray-600 pt-4 space-y-2 text-gray-800 dark:text-gray-200">
            {hardestDemonDisplay && hardestDemonDisplay.levelName ? (
              <p>
                <span className="font-semibold">{t('hardest_demon')}:</span>{' '}
                {(hardestDemonDisplay.levelId || hardestDemonDisplay.id) ? (
                     <Link to={`/level/${hardestDemonDisplay.listType}/${hardestDemonDisplay.levelId || hardestDemonDisplay.id}`} className="text-cyan-600 dark:text-cyan-400 hover:underline">
                       {hardestDemonDisplay.levelName} (#{hardestDemonDisplay.placement})
                     </Link>
                ) : (
                    <span>{hardestDemonDisplay.levelName} (#{hardestDemonDisplay.placement || '?'})</span>
                )}
              </p>
            ) : (
              <p><span className="font-semibold">{t('hardest_demon')}:</span> {t('na')}</p>
            )}

             {totalCompleted > 0 && (
                <p><span className="font-semibold">{t('completed_levels')}:</span> {totalCompleted}</p>
             )}
             {totalVerified > 0 && (
                <p><span className="font-semibold">{t('verified_levels')}:</span> {totalVerified}</p>
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