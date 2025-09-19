// src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Check, X } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner'; // Import the spinner

export default function AdminDashboard() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { token } = useAuth();

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/admin/submissions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubmissions(res.data);
    } catch (err) {
      setError('Failed to fetch submissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [token]);

  const handleUpdate = async (submissionId, newStatus) => {
    try {
      await axios.post('/api/admin/update-submission', 
        { submissionId, newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchSubmissions();
    } catch (err) {
      alert(`Failed to update submission: ${err.response?.data?.message}`);
    }
  };

  const getYouTubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  if (loading) return <LoadingSpinner text="Loading submissions..." />;
  if (error) return <div className="text-red-400 text-center py-10">{error}</div>;

  return (
    <div className="text-white max-w-7xl mx-auto py-8 px-4">
      <h1 className="text-4xl font-bold mb-8">Admin Dashboard: Pending Submissions</h1>
      
      <div className="space-y-4">
        {submissions.length === 0 ? (
          <p className="text-gray-400 text-center py-10">No pending submissions.</p>
        ) : (
          submissions.map((sub) => (
            <div key={sub.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${getYouTubeId(sub.videoId)}`}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute top-0 left-0 w-full h-full rounded"
                ></iframe>
              </div>
              <div className="flex flex-col justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-cyan-400">{sub.levelName}</h3>
                  <p className="text-lg">Player: <span className="font-semibold">{sub.player}</span></p>
                  <p className="text-lg">Progress: <span className="font-semibold">{sub.percent}%</span></p>
                  <p className="text-sm text-gray-400 mt-2">Notes: <span className="italic">{sub.notes || 'None'}</span></p>
                  <a href={sub.rawFootageLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-sm mt-1 block">View Raw Footage</a>
                </div>
                <div className="flex items-center gap-4 mt-4">
                  <button onClick={() => handleUpdate(sub.id, 'APPROVED')} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded flex items-center justify-center gap-2 transition-colors">
                    <Check /> Approve
                  </button>
                  <button onClick={() => handleUpdate(sub.id, 'REJECTED')} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded flex items-center justify-center gap-2 transition-colors">
                    <X /> Reject
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}