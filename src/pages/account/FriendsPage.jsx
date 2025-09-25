import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { UserPlus, UserCheck, UserX } from 'lucide-react';

export default function FriendsPage() {
  const { token } = useAuth();
  const [requests, setRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('requests');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const requestsPromise = axios.get('/api/friends?filter=requests', { headers: { Authorization: `Bearer ${token}` } });
      const friendsPromise = axios.get('/api/friends?filter=list', { headers: { Authorization: `Bearer ${token}` } });
      
      const [requestsRes, friendsRes] = await Promise.all([requestsPromise, friendsPromise]);
      
      setRequests(requestsRes.data);
      setFriends(friendsRes.data);
    } catch (err) {
      setError('Failed to load friends data.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }
    try {
      // Updated API call to the consolidated endpoint
      const res = await axios.get(`/api/users?q=${searchQuery}`, { headers: { Authorization: `Bearer ${token}` } });
      setSearchResults(res.data);
    } catch (err) {
      console.error('Search failed:', err);
    }
  };

  const handleSendRequest = async (receiverId) => {
    try {
      await axios.post('/api/friends', { action: 'request', receiverId }, { headers: { Authorization: `Bearer ${token}` } });
      alert('Friend request sent!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send request.');
    }
  };

  const handleRespondRequest = async (friendshipId, response) => {
    try {
      await axios.put('/api/friends', { action: 'response', friendshipId, response }, { headers: { Authorization: `Bearer ${token}` } });
      fetchData(); // Refresh both requests and friends lists
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to respond.');
    }
  };

  if (isLoading) return <p className="text-gray-400">Loading...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="space-y-8 text-white">
      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button onClick={() => setActiveTab('requests')} className={`px-4 py-2 text-lg font-semibold ${activeTab === 'requests' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400'}`}>Requests ({requests.length})</button>
        <button onClick={() => setActiveTab('friends')} className={`px-4 py-2 text-lg font-semibold ${activeTab === 'friends' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400'}`}>Friends ({friends.length})</button>
        <button onClick={() => setActiveTab('add')} className={`px-4 py-2 text-lg font-semibold ${activeTab === 'add' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400'}`}>Add Friend</button>
      </div>

      {/* Friend Requests Section */}
      {activeTab === 'requests' && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Incoming Friend Requests</h2>
          <div className="bg-gray-800 rounded-lg p-4 space-y-3">
            {requests.length > 0 ? requests.map(req => (
              <div key={req.id} className="flex justify-between items-center bg-gray-700 p-3 rounded">
                <span className="font-semibold">{req.requester.username}</span>
                <div className="flex gap-2">
                  <button onClick={() => handleRespondRequest(req.id, 'ACCEPTED')} className="p-2 bg-green-600 hover:bg-green-700 rounded-full" title="Accept"><UserCheck size={18} /></button>
                  <button onClick={() => handleRespondRequest(req.id, 'DECLINED')} className="p-2 bg-red-600 hover:bg-red-700 rounded-full" title="Decline"><UserX size={18} /></button>
                </div>
              </div>
            )) : <p className="text-gray-500">No pending friend requests.</p>}
          </div>
        </div>
      )}

      {/* Friends List Section */}
      {activeTab === 'friends' && (
         <div>
          <h2 className="text-2xl font-bold mb-4">My Friends</h2>
          <div className="bg-gray-800 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {friends.length > 0 ? friends.map(friend => (
              <Link key={friend.id} to={`/u/${friend.username}`} className="block bg-gray-700 p-3 rounded hover:bg-cyan-800 text-center font-semibold transition-colors">
                {friend.username}
              </Link>
            )) : <p className="text-gray-500 col-span-full">You haven't added any friends yet.</p>}
          </div>
        </div>
      )}

      {/* Add Friends Section */}
      {activeTab === 'add' && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Find and Add Friends</h2>
          <div className="bg-gray-800 rounded-lg p-4">
            <form onSubmit={handleSearch} className="flex gap-2 mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by username (3+ characters)..."
                className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200"
              />
              <button type="submit" className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg font-semibold">Search</button>
            </form>
            <div className="space-y-2">
              {searchResults.map(user => (
                <div key={user.id} className="flex justify-between items-center p-2">
                  <span>{user.username}</span>
                  <button onClick={() => handleSendRequest(user.id)} className="p-2 hover:bg-gray-700 rounded-full" title="Send Friend Request"><UserPlus size={18} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}