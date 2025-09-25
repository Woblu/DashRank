import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import LevelCard from '../components/LevelCard';
import { Award, BarChart2, Hash, UserPlus } from 'lucide-react';

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
      // Updated API call to the consolidated endpoint
      const res = await axios.get(`/api/users?username=${username}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfile(res.data);
    } catch (err) {
      setError(err.response?.data?.message || `Failed to load profile for ${username}.`);
      if (err.response?.data?.data) {
        setErrorData(err.response.data.data); // Store extra data for the 'not friends' UI
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
      fetchProfile(); // Re-fetch profile to update friend status
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send request.');
    }
  };


  if (isLoading) {
    return <p className="text-center text-gray-400 mt-12">Loading profile...</p>;
  }

  // If there's an error (e.g., not friends), display a special UI
  if (error) {
    return (
      <div className="text-center text-gray-400 mt-12 bg-gray-800 max-w-lg mx-auto p-8 rounded-lg">
        <h2 className="text-2xl font-bold text-white mb-2">{errorData?.username || username}</h2>
        <p className="text-red-500 mb-4">{error}</p>
        {errorData && errorData.friendStatus === 'not_friends' && (
          <button 
            onClick={() => handleSendRequest(errorData.userId)}
            className="flex items-center justify-center gap-2 mx-auto px-4 py-2 rounded-lg font-semibold bg-cyan-600 hover:bg-cyan-700 text-white transition-colors"
          >
            <UserPlus size={18} /> Send Friend Request
          </button>
        )}
         {errorData && errorData.friendStatus === 'PENDING' && (
          <p className="text-yellow-500">Friend request pending...</p>
        )}
      </div>
    );
  }

  if (!profile) return null;

  const isOwnProfile = user.username === username;

  return (
    <div className="max-w-4xl mx-auto text-white space-y-10">
      <h1 className="text-5xl font-bold text-cyan-400 text-center">{profile.username}'s Profile</h1>
      
      {profile.pinnedRecord ? (
        <div>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><Award className="text-yellow-400" /> Pinned Completion</h2>
          <LevelCard level={profile.pinnedRecord} listType="progression" isOwnProfile={isOwnProfile} />
        </div>
      ) : isOwnProfile && (
         <div className="text-center text-gray-500 border-2 border-dashed border-gray-700 p-6 rounded-lg">
            You haven't pinned a record yet. Go to your Progression Tracker to pin your hardest completion!
         </div>
      )}

      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Stats</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-lg">
            <div className="flex items-center gap-3"><Hash className="text-cyan-400 h-6 w-6"/> <strong>Total Demons Beaten:</strong> {profile.stats.totalDemons}</div>
            <div className="flex items-center gap-3"><BarChart2 className="text-cyan-400 h-6 w-6"/> <strong>Average Attempts:</strong> {profile.stats.averageAttempts.toLocaleString()}</div>
        </div>
      </div>
      
      <div>
        <h2 className="text-2xl font-bold mb-4">Completed Demons</h2>
        <div className="flex flex-col gap-4">
          {profile.progressionTracker.length > 0 ? (
            profile.progressionTracker.map((record) => (
              <LevelCard key={record.id} level={record} listType="progression" isOwnProfile={isOwnProfile} />
            ))
          ) : (
            <p className="text-gray-500">This user hasn't added any completed demons yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}