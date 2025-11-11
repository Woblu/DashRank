import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import LevelCard from '../components/LevelCard';
import { Award, BarChart2, Hash, UserPlus, ServerCrash, Check, Clock } from 'lucide-react'; // Added Check and Clock
import LoadingSpinner from '../components/LoadingSpinner'; // 1. Import
import { useLanguage } from '../contexts/LanguageContext'; // 2. Import

export default function UserProfile() {
  const { username } = useParams();
  const { token, user } = useAuth();
  const { t } = useLanguage(); // 3. Initialize
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorData, setErrorData] = useState(null);

  const fetchProfile = async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    setErrorData(null);
    try {
      const res = await axios.get(`/api/users?username=${username}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfile(res.data);
    } catch (err) {
      // 4. Translate error messages
      let errorMsg = err.response?.data?.message || t('user_not_found_dynamic', { username: username });
      if (errorMsg.includes('not your friend')) {
        errorMsg = t('not_your_friend_error', { username: username });
      } else if (errorMsg.includes('view your own profile')) {
        errorMsg = t('own_profile_error');
      }
      setError(errorMsg);
      if (err.response?.data?.data) {
        setErrorData(err.response.data.data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [username, token, t]); // Add t to dependency array

  const handleAddFriend = async () => {
    try {
      await axios.post('/api/friends', { receiverId: profile.user.id }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchProfile(); // Re-fetch profile to update friendship status
    } catch (err) {
      let errorMsg = err.response?.data?.message || t('friend_request_failed');
      if (errorMsg.includes('already sent')) {
        errorMsg = t('request_already_sent');
      } else if (errorMsg.includes('already friends')) {
        errorMsg = t('already_friends');
      }
      alert(errorMsg);
    }
  };

  const renderFriendshipButton = () => {
    const status = errorData?.friendshipStatus;
    switch (status) {
      case 'NONE':
        return <button onClick={handleAddFriend} className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-accent text-text-on-ui hover:opacity-90 transition-colors"><UserPlus size={18} /> {t('add_friend')}</button>; // THEMED
      case 'PENDING_YOU_SENT':
        return <button disabled className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-ui-bg text-text-muted cursor-not-allowed"><Clock size={18} /> {t('friend_request_pending')}</button>; // THEMED
      case 'FRIEND':
        return <button disabled className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-green-600/80 text-white cursor-not-allowed"><Check size={18} /> {t('friend')}</button>; // Semantic Color
      default:
        return null;
    }
  };

  if (isLoading) return <LoadingSpinner message={t('loading_profile')} />; // THEMED

  if (error) {
    return (
      <div className="text-center p-8">
        <ServerCrash className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-red-500">{t('user_not_found')}</h1>
        <p className="text-text-muted mt-2 mb-6">{error}</p> {/* THEMED */}
        <Link to="/account/friends" className="mt-4 inline-flex items-center text-accent hover:underline"> {/* THEMED */}
          <ChevronLeft size={16} /> {t('go_back_to_friends')}
        </Link>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto p-4 text-text-primary"> {/* THEMED */}
      <div className="mb-4">
        <Link to="/account/friends" className="flex items-center gap-2 text-accent hover:text-accent/80 transition-colors"> {/* THEMED */}
          <ChevronLeft size={20} />
          {t('go_back_to_friends')}
        </Link>
      </div>
      
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-5xl font-bold">{profile.user.username}</h1>
        {errorData && renderFriendshipButton()}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column (Pinned Record & Stats) */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-ui-bg p-6 rounded-lg shadow-inner border border-primary-bg"> {/* THEMED */}
            <h2 className="text-2xl font-bold mb-4 text-text-on-ui">{t('pinned_record')}</h2> {/* THEMED */}
            {profile.pinnedRecord ? (
              <LevelCard level={profile.pinnedRecord} index={0} listType="progression" />
            ) : (
              <p className="text-text-muted">{t('no_pinned_record')}</p> /* THEMED */
            )}
          </div>
          
          <div className="bg-ui-bg p-6 rounded-lg shadow-inner border border-primary-bg"> {/* THEMED */}
            <h2 className="text-2xl font-bold mb-4 text-text-on-ui">{t('player_stats')}</h2> {/* THEMED */}
            <div className="space-y-6">
              <div className="text-center bg-primary-bg p-4 rounded-lg"> {/* THEMED */}
                <Hash className="text-accent h-8 w-8 mx-auto mb-2"/> {/* THEMED */}
                <p className="text-4xl font-bold text-text-on-ui">{profile.stats.totalDemons}</p> {/* THEMED */}
                <p className="text-text-muted">{t('demons_beaten')}</p> {/* THEMED */}
              </div>
              <div className="text-center bg-primary-bg p-4 rounded-lg"> {/* THEMED */}
                <BarChart2 className="text-accent h-8 w-8 mx-auto mb-2"/> {/* THEMED */}
                <p className="text-4xl font-bold text-text-on-ui">{profile.stats.averageAttempts.toLocaleString()}</p> {/* THEMED */}
                <p className="text-text-muted">{t('average_attempts')}</p> {/* THEMED */}
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Column (Full Progression List) */}
        <div className="md:col-span-2">
          <h2 className="text-3xl font-bold mb-6 text-text-primary">{t('completion_log')}</h2> {/* THEMED */}
          <div className="flex flex-col gap-4">
            {profile.progressionTracker.length > 0 ? (
              profile.progressionTracker.map((record, index) => (
                <LevelCard key={record.id} level={record} index={index} listType="progression" />
              ))
            ) : (
              <p className="text-center text-text-muted border-2 border-dashed border-primary-bg p-10 rounded-lg"> {/* THEMED */}
                {t('no_completion_log')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}