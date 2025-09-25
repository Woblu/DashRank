import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import LevelCard from '../components/LevelCard';
import { Award, BarChart2, Hash } from 'lucide-react';

export default function UserProfile() {
  const { username } = useParams();
  const { token, user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) return;
      setIsLoading(true);
      setError(null);
      try {
        const res = await axios.get(`/api/users/${username}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProfile(res.data);
      } catch (err) {
        setError(err.response?.data?.message || `Failed to load profile for ${username}.`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [username, token]);

  if (isLoading) {
    return <p className="text-center text-gray-400 mt-12">Loading profile...</p>;
  }

  // If there's an error (e.g., not friends), display the error message.
  // We don't show the friend request button here yet; that will be on the Friends page.
  if (error) {
    return <p className="text-center text-red-500 mt-12">{error}</p>;
  }

  if (!profile) {
    return null; // Should not happen if loading is false and no error, but good practice
  }

  // Determine if the viewer is looking at their own profile
  const isOwnProfile = user.username === username;

  return (
    <div className="max-w-4xl mx-auto text-white space-y-10">
      <h1 className="text-5xl font-bold text-cyan-400 text-center">{profile.username}'s Profile</h1>
      
      {/* Pinned Record Section */}
      {profile.pinnedRecord ? (
        <div>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Award className="text-yellow-400" /> Pinned Completion
          </h2>
          <LevelCard 
            level={profile.pinnedRecord} 
            listType="progression" 
            onEdit={() => {}} // We can add edit/delete functionality here later if needed
            onDelete={() => {}}
            onPin={() => {}}
          />
        </div>
      ) : isOwnProfile && (
         <div className="text-center text-gray-500 border-2 border-dashed border-gray-700 p-6 rounded-lg">
            You haven't pinned a record yet. Go to your Progression Tracker to pin your hardest completion!
         </div>
      )}

      {/* Stats Section */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Stats</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-lg">
            <div className="flex items-center gap-3">
              <Hash className="text-cyan-400 h-6 w-6"/> 
              <strong>Total Demons Beaten:</strong> {profile.stats.totalDemons}
            </div>
            <div className="flex items-center gap-3">
              <BarChart2 className="text-cyan-400 h-6 w-6"/> 
              <strong>Average Attempts:</strong> {profile.stats.averageAttempts.toLocaleString()}
            </div>
        </div>
      </div>
      
      {/* Progression Tracker Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Completed Demons</h2>
        <div className="flex flex-col gap-4">
          {profile.progressionTracker.length > 0 ? (
            profile.progressionTracker.map((record) => (
              <LevelCard 
                key={record.id} 
                level={record} 
                listType="progression" 
                onEdit={() => {}}
                onDelete={() => {}}
                onPin={() => {}}
              />
            ))
          ) : (
            <p className="text-gray-500">This user hasn't added any completed demons yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}