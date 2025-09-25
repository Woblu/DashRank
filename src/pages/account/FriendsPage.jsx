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

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const requestsPromise = axios.get('/api/friends/requests', { headers: { Authorization: `Bearer ${token}` } });
      const friendsPromise = axios.get('/api/friends', { headers: { Authorization: `Bearer ${token}` } });
      const [requestsRes, friendsRes] = await Promise.all([requestsPromise, friendsPromise]);
      setRequests(requestsRes.data);
      setFriends(friendsRes.data);
    } catch (err) {
      setError('Failed to load friends data.');
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
      const res = await axios.get(`/api/users/search?q=${searchQuery}`, { headers: { Authorization: `Bearer ${token}` } });
      setSearchResults(res.data);
    } catch (err) {
      console.error('Search failed:', err);
    }
  };

  const handleSendRequest = async (receiverId) => {
    try {
      await axios.post('/api/friends/request', { receiverId }, { headers: { Authorization: `Bearer ${token}` } });
      alert('Friend request sent!');
      // Optionally, update the UI to show the request is pending
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send request.');
    }
  };

  const handleRespondRequest = async (friendshipId, response) => {
    try {
      await axios.put('/api/friends/response', { friendshipId, response }, { headers: { Authorization: `Bearer ${token}` } });
      fetchData(); // Refresh both requests and friends lists
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to respond.');
    }
  };

  if (isLoading) return <p className="text-gray-400">Loading...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="space-y-8 text-white">
      {/* Friend Requests Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Incoming Friend Requests ({requests.length})</h2>
        <div className="bg-gray-800 rounded-lg p-4 space-y-3">
          {requests.length > 0 ? requests.map(req => (
            <div key={req.id} className="flex justify-between items-center bg-gray-700 p-3 rounded">
              <span className="font-semibold">{req.requester.username}</span>
              <div className="flex gap-2">
                <button onClick={() => handleRespondRequest(req.id, 'ACCEPTED')} className="p-2 bg-green-600 hover:bg-green-700 rounded-full"><UserCheck size={18} /></button>
                <button onClick={() => handleRespondRequest(req.id, 'DECLINED')} className="p-2 bg-red-600 hover:bg-red-700 rounded-full"><UserX size={18} /></button>
              </div>
            </div>
          )) : <p className="text-gray-500">No pending friend requests.</p>}
        </div>
      </div>

      {/* Add Friends Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Add Friends</h2>
        <div className="bg-gray-800 rounded-lg p-4">
          <form onSubmit={handleSearch} className="flex gap-2 mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by username..."
              className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200"
            />
            <button type="submit" className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg font-semibold">Search</button>
          </form>
          <div className="space-y-2">
            {searchResults.map(user => (
              <div key={user.id} className="flex justify-between items-center p-2">
                <span>{user.username}</span>
                <button onClick={() => handleSendRequest(user.id)} className="p-2 hover:bg-gray-700 rounded-full"><UserPlus size={18} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Friends List Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4">My Friends ({friends.length})</h2>
        <div className="bg-gray-800 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {friends.length > 0 ? friends.map(friend => (
            <Link key={friend.id} to={`/u/${friend.username}`} className="block bg-gray-700 p-3 rounded hover:bg-cyan-800 text-center font-semibold">
              {friend.username}
            </Link>
          )) : <p className="text-gray-500 col-span-full">You haven't added any friends yet.</p>}
        </div>
      </div>
    </div>
  );
}