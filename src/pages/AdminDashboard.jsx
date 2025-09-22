// src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Check, X, Clock, ThumbsUp, ThumbsDown } from 'lucide-react';
import { getVideoEmbedUrl } from '../utils/videoUtils.js';

export default function AdminDashboard() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('PENDING');
  const { token } = useAuth();

  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!token) return;
      setLoading(true);
      setError('');
      try {
        const res = await axios.get(`/api/admin/submissions?status=${activeTab}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSubmissions(res.data);
      } catch (err) {
        setError('Failed to fetch submissions.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [token, activeTab]);

  const handleUpdate = async (submissionId, newStatus) => {
    try {
      await axios.post('/api/admin/update-submission', 
        { submissionId, newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSubmissions(prev => prev.filter(sub => sub.id !== submissionId));
    } catch (err) {
      alert(`Failed to update submission: ${err.response?.data?.message}`);
    }
  };

  const tabs = [
    { status: 'PENDING', label: 'Pending', icon: Clock },
    { status: 'APPROVED', label: 'Approved', icon: ThumbsUp },
    { status: 'REJECTED', label: 'Rejected', icon: ThumbsDown },
  ];

  return (
    <div className="text-white max-w-7xl mx-auto py-8 px-4">
      <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>
      
      <div className="flex border-b border-gray-700 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.status}
            onClick={() => setActiveTab(tab.status)}
            className={`flex items-center gap-2 px-4 py-2 text-lg font-semibold border-b-2 transition-colors ${
              activeTab === tab.status
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <tab.icon className="w-5 h-5" />
            {tab.label}
          </button>
        ))}
      </div>
      
      {loading && <div className="text-center py-10">Loading submissions...</div>}
      {error && <div className="text-red-400 text-center py-10">{error}</div>}

      {!loading && !error && (
        <div className="space-y-4">
          {submissions.length === 0 ? (
            <p className="text-gray-400 text-center py-10">No {activeTab.toLowerCase()} submissions.</p>
          ) : (
            submissions.map((sub) => {
              const embedInfo = getVideoEmbedUrl(sub.videoId);
              return (
                <div key={sub.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                    {embedInfo ? (
                      embedInfo.type === 'iframe' ? (
                        <iframe src={embedInfo.url} title="Submission Video" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="absolute top-0 left-0 w-full h-full rounded bg-black"></iframe>
                      ) : (
                        <video src={embedInfo.url} controls className="absolute top-0 left-0 w-full h-full rounded bg-black"></video>
                      )
                    ) : (
                      <div className="absolute top-0 left-0 w-full h-full rounded bg-black flex flex-col items-center justify-center">
                        <p>Preview not available.</p>
                        <a href={sub.videoId} target="_blank" rel="noopener noreferrer" className="mt-2 text-cyan-400 hover:underline">View Original Link</a>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-cyan-400">{sub.levelName}</h3>
                      <p className="text-lg">Player: <span className="font-semibold">{sub.player}</span></p>
                      <p className="text-lg">Progress: <span className="font-semibold">{sub.percent}%</span></p>
                      <p className="text-sm text-gray-400 mt-2">Notes: <span className="italic">{sub.notes || 'None'}</span></p>
                      <a href={sub.rawFootageLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-sm mt-1 block">View Raw Footage</a>
                    </div>
                    {activeTab === 'PENDING' && (
                      <div className="flex items-center gap-4 mt-4">
                        <button onClick={() => handleUpdate(sub.id, 'APPROVED')} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded flex items-center justify-center gap-2 transition-colors">
                          <Check /> Approve
                        </button>
                        <button onClick={() => handleUpdate(sub.id, 'REJECTED')} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded flex items-center justify-center gap-2 transition-colors">
                          <X /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  );
}