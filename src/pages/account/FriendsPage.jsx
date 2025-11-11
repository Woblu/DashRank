import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { UserPlus, UserCheck, UserX } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext'; // 1. Import

export default function FriendsPage() {
  const { token } = useAuth();
  const { t } = useLanguage(); // 2. Initialize
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
      setError(t('friends_load_failed')); // Translated
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
      setError(t('search_too_short')); // Translated
      setSearchResults([]);
      return;
    }
    setError('');
    try {
      // Assuming you have an endpoint like this. If not, this needs to be created.
      const response = await axios.get(`/api/users?search=${searchQuery}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setSearchResults(response.data);
    } catch (err) {
      setError(t('user_search_failed')); // Translated
      setSearchResults([]);
    }
  };

  const handleSendRequest = async (receiverId) => {
    try {
      await axios.post('/api/friends', { receiverId }, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      alert(t('friend_request_sent')); // Translated
      // Remove user from search results to prevent re-adding
      setSearchResults(prev => prev.filter(user => user.id !== receiverId));
    } catch (err) {
      alert(err.response?.data?.message || t('friend_request_failed')); // Translated
    }
  };

  const handleRequestResponse = async (requestId, status) => {
    try {
      await axios.put('/api/friends', { requestId, status }, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      // Refresh all data
      fetchData();
    } catch (err) {
      alert(t('friend_response_failed')); // Translated
    }
  };

  const tabs = [
    { id: 'requests', name: t('friend_requests') },
    { id: 'list', name: t('my_friends') },
    { id: 'add', name: t('add_friend') },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-primary-bg"> {/* THEMED */}
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg ${
                activeTab === tab.id
                  ? 'border-accent text-accent' // THEMED
                  : 'border-transparent text-text-muted hover:text-accent hover:border-accent/50' // THEMED
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {isLoading && <p className="text-text-muted text-center">{t('loading_friends_data')}</p>} {/* THEMED */}
      {error && <p className="text-red-400 text-center">{error}</p>}

      {/* Friend Requests Tab */}
      {activeTab === 'requests' && !isLoading && (
        <div className="bg-ui-bg border border-primary-bg rounded-lg p-6 space-y-4"> {/* THEMED */}
          {requests.length > 0 ? requests.map(req => (
            <div key={req.id} className="flex justify-between items-center p-3 bg-primary-bg rounded-lg"> {/* THEMED */}
              <span className="font-semibold text-text-primary">{req.requester.username}</span> {/* THEMED */}
              <div className="flex gap-2">
                <button 
                  onClick={() => handleRequestResponse(req.id, 'ACCEPTED')} 
                  className="p-2 bg-green-500/20 hover:bg-green-500/40 text-green-400 rounded-full transition-colors"
                  aria-label={t('accept')}
                >
                  <UserCheck size={20} />
                </button>
                <button 
                  onClick={() => handleRequestResponse(req.id, 'DECLINED')}
                  className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-full transition-colors"
                  aria-label={t('decline')}
                >
                  <UserX size={20} />
                </button>
              </div>
            </div>
          )) : <p className="text-text-muted text-center">{t('no_pending_requests')}</p>} {/* THEMED */}
        </div>
      )}

      {/* Friends List Tab */}
      {activeTab === 'list' && !isLoading && (
        <div className="bg-ui-bg border border-primary-bg rounded-lg p-6"> {/* THEMED */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {friends.length > 0 ? friends.map(friend => (
              <Link key={friend.id} to={`/u/${friend.username}`} className="font-semibold text-text-on-ui hover:text-accent transition-colors"> {/* THEMED */}
                {friend.username}
              </Link>
            )) : <p className="text-text-muted col-span-full text-center">{t('no_friends_yet')}</p>} {/* THEMED */}
          </div>
        </div>
      )}

      {/* Add Friends Tab */}
      {activeTab === 'add' && (
        <div>
          <h2 className="text-2xl font-bold mb-4 text-text-primary">{t('find_and_add_friends')}</h2> {/* THEMED */}
          <div className="bg-ui-bg border border-primary-bg rounded-lg p-4"> {/* THEMED */}
            <form onSubmit={handleSearch} className="flex gap-2 mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('search_by_username')}
                className="w-full p-2 rounded-lg border border-primary-bg bg-primary-bg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent" /* THEMED */
              />
              <button type="submit" className="px-4 py-2 bg-accent hover:opacity-90 rounded-lg font-semibold text-text-on-ui">Search</button> {/* THEMED */}
            </form>
            <div className="space-y-2">
              {searchResults.map(user => (
                <div key={user.id} className="flex justify-between items-center p-2 bg-primary-bg rounded-lg"> {/* THEMED */}
                  <span className="text-text-primary">{user.username}</span> {/* THEMED */}
                  <button onClick={() => handleSendRequest(user.id)} className="p-2 text-accent hover:bg-ui-bg rounded-full transition-colors" aria-label={t('send_friend_request')}> {/* THEMED */}
                    <UserPlus size={20} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}