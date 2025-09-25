import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import LevelCard from '../components/LevelCard';
import { Award, BarChart2, Hash, UserPlus, ServerCrash } from 'lucide-react';

export default function UserProfile() {
  const { username } = useParams();
  const { token, user } = useAuth();
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
      setError(err.response?.data?.message || `Failed to load profile for ${username}.`);
      if (err.response?.data?.data) {
        setErrorData(err.response.data.data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [username, token]);
  
  const handleSendRequest = async (receiverId) => {
    try {
      await axios.post('/api/friends', { action: 'request', receiverId }, { headers: { Authorization: `Bearer ${token}` } });
      alert('Friend request sent!');
      fetchProfile();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send request.');
    }
  };


  if (isLoading) {
    return <p className="text-center text-gray-400 mt-12 animate-pulse">Loading profile...</p>;
  }

  if (error) {
    return (
      <div className="text-center text-gray-400 mt-12 bg-gray-800/50 backdrop-blur-sm max-w-lg mx-auto p-8 rounded-2xl border border-gray-700">
        <ServerCrash size={48} className="mx-auto text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">{errorData?.username || username}</h2>
        <p className="text-red-400 mb-6">{error}</p>
        {errorData && errorData.friendStatus === 'not_friends' && (
          <button 
            onClick={() => handleSendRequest(errorData.userId)}
            className="flex items-center justify-center gap-2 mx-auto px-4 py-2 rounded-lg font-semibold bg-cyan-600 hover:bg-cyan-700 text-white transition-colors shadow-lg shadow-cyan-500/20"
          >
            <UserPlus size={18} /> Send Friend Request
          </button>
        )}
         {errorData && errorData.friendStatus === 'PENDING' && (
          <p className="text-yellow-500 font-semibold">Friend request pending...</p>
        )}
      </div>
    );
  }

  if (!profile) return null;

  const isOwnProfile = user.username === username;

  return (
    <div className="max-w-7xl mx-auto text-white space-y-12">
      {/* Profile Header */}
      <div className="text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-white drop-shadow-[0_0_15px_rgba(8,145,178,0.5)]">
          {profile.username}
        </h1>
        <p className="text-gray-400 mt-2">Player Profile</p>
      </div>
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Pinned Demon */}
        <div className="lg:col-span-2">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 h-full">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
              <Award className="text-yellow-400" /> Pinned Completion
            </h2>
            {profile.pinnedRecord ? (
                <LevelCard level={profile.pinnedRecord} listType="progression" />
            ) : isOwnProfile ? (
                <Link to="/progression" className="flex items-center justify-center h-48 text-center text-gray-500 border-2 border-dashed border-gray-700 p-6 rounded-lg hover:bg-gray-800 hover:text-cyan-400 transition-colors">
                  You haven't pinned a record yet. <br/> Go to your Progression Tracker to pin your hardest completion!
                </Link>
            ) : (
                <div className="flex items-center justify-center h-48 text-center text-gray-500 border-2 border-dashed border-gray-700 p-6 rounded-lg">
                  This player hasn't pinned a record.
                </div>
            )}
          </div>
        </div>
        
        {/* Right Column: Stats */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 h-full">
            <h2 className="text-2xl font-bold mb-4">Player Stats</h2>
            <div className="space-y-6">
              <div className="text-center bg-gray-900/50 p-4 rounded-lg">
                <Hash className="text-cyan-400 h-8 w-8 mx-auto mb-2"/> 
                <p className="text-4xl font-bold">{profile.stats.totalDemons}</p>
                <p className="text-gray-400">Demons Beaten</p>
              </div>
              <div className="text-center bg-gray-900/50 p-4 rounded-lg">
                <BarChart2 className="text-cyan-400 h-8 w-8 mx-auto mb-2"/> 
                <p className="text-4xl font-bold">{profile.stats.averageAttempts.toLocaleString()}</p>
                <p className="text-gray-400">Average Attempts</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Full Progression List */}
      <div>
        <h2 className="text-3xl font-bold mb-6">Completion Log</h2>
        <div className="flex flex-col gap-4">
          {profile.progressionTracker.length > 0 ? (
            profile.progressionTracker.map((record, index) => (
              <LevelCard key={record.id} level={record} index={index} listType="progression" />
            ))
          ) : (
            <div className="text-center text-gray-500 border-2 border-dashed border-gray-700 p-10 rounded-lg">
              <p>This user hasn't added any completed demons yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}