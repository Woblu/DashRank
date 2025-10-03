import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Check, X, Clock, ThumbsUp, ThumbsDown, ShieldAlert, Trash2, UserX, CheckCircle, List } from 'lucide-react';
import { getVideoEmbedUrl } from '../utils/videoUtils.js';
import { Link } from 'react-router-dom';
import ListManager from '../components/admin/ListManager'; // ** THE FIX IS HERE **

export default function AdminDashboard() {
  const [submissions, setSubmissions] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('PENDING');
  const { token } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      if (activeTab === 'LIST_MANAGEMENT') {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      try {
        let res;
        if (activeTab === 'LAYOUT_REPORTS') {
          res = await axios.get('/api/admin/layout-reports', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setReports(res.data);
          setSubmissions([]);
        } else {
          res = await axios.get(`/api/admin/submissions?status=${activeTab}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setSubmissions(res.data);
          setReports([]);
        }
      } catch (err) {
        setError(`Failed to fetch ${activeTab.toLowerCase().replace('_', ' ')} data.`);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, activeTab]);

  const handleUpdateSubmission = async (submissionId, newStatus) => {
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

  const handleDismissReport = async (reportId) => {
    if (!window.confirm('Are you sure you want to dismiss this report? This will mark it as resolved.')) return;
    try {
      await axios.put('/api/admin/layout-reports', { reportId, status: 'RESOLVED' }, { headers: { Authorization: `Bearer ${token}` } });
      setReports(prev => prev.filter(rep => rep.id !== reportId));
    } catch (err) {
      alert('Failed to dismiss report.');
    }
  };

  const handleRemoveLayout = async (layoutId) => {
    if (!window.confirm('Are you sure you want to permanently delete this layout? This action cannot be undone.')) return;
    try {
      await axios.delete('/api/admin/layouts', { 
          headers: { Authorization: `Bearer ${token}` },
          data: { layoutId }
        }
      );
      setReports(prev => prev.filter(rep => rep.reportedLayout.id !== layoutId));
    } catch (err) {
      alert('Failed to remove layout.');
    }
  };

  const handleBanCreator = async (userIdToBan, username) => {
    if (!window.confirm(`Are you sure you want to ban ${username} from the Creator's Workshop?`)) return;
    try {
      await axios.put('/api/admin/users/ban', { userIdToBan }, { headers: { Authorization: `Bearer ${token}` } });
      alert(`${username} has been banned from the workshop.`);
    } catch (err) {
      alert('Failed to ban user.');
    }
  };

  const tabs = [
    { status: 'PENDING', label: 'Submissions', icon: Clock },
    { status: 'LAYOUT_REPORTS', label: 'Layout Reports', icon: ShieldAlert },
    { status: 'LIST_MANAGEMENT', label: 'List Management', icon: List },
    { status: 'APPROVED', label: 'Approved', icon: ThumbsUp },
    { status: 'REJECTED', label: 'Rejected', icon: ThumbsDown },
  ];
  
  const hostname = window.location.hostname;

  return (
    <div className="text-white max-w-7xl mx-auto py-8 px-4">
      <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>
      
      <div className="flex border-b border-gray-700 mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.status}
            onClick={() => setActiveTab(tab.status)}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 text-lg font-semibold border-b-2 transition-colors ${
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
      
      {loading && <div className="text-center py-10 animate-pulse">Loading...</div>}
      {error && <div className="text-red-400 text-center py-10">{error}</div>}

      {!loading && !error && (
        <div>
          {activeTab === 'LIST_MANAGEMENT' && <ListManager />}

          {['PENDING', 'APPROVED', 'REJECTED'].includes(activeTab) && (
            submissions.length === 0 ? (
              <p className="text-gray-400 text-center py-10">No {activeTab.toLowerCase()} submissions.</p>
            ) : (
              submissions.map((sub) => {
                const embedInfo = getVideoEmbedUrl(sub.videoId, hostname);
                return (
                  <div key={sub.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                      {embedInfo?.url ? (
                        embedInfo.type === 'iframe' ? (
                          <iframe src={embedInfo.url} title="Submission Video" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen className="absolute top-0 left-0 w-full h-full rounded bg-black"></iframe>
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
                          <button onClick={() => handleUpdateSubmission(sub.id, 'APPROVED')} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded flex items-center justify-center gap-2 transition-colors">
                            <Check /> Approve
                          </button>
                          <button onClick={() => handleUpdateSubmission(sub.id, 'REJECTED')} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded flex items-center justify-center gap-2 transition-colors">
                            <X /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )
          )}
          {activeTab === 'LAYOUT_REPORTS' && (
             reports.length > 0 ? (
              reports.map(report => (
                <div key={report.id} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-2">
                      <h3 className="text-xl font-bold text-red-400 flex items-center gap-2">
                        <ShieldAlert /> Report for: <Link to={`/layouts/${report.reportedLayout.id}`} className="text-cyan-400 hover:underline">{report.reportedLayout.levelName}</Link>
                      </h3>
                      <p className="text-gray-300 bg-gray-900/50 p-3 rounded-md"><strong>Reason:</strong> {report.reason}</p>
                      <div className="text-xs text-gray-500 pt-2">
                        <span>Reported by: {report.reporter.username}</span> | <span>Layout by: {report.reportedLayout.creator.username}</span>
                      </div>
                    </div>
                    <div className="md:col-span-1 flex flex-col justify-center gap-2">
                      <button onClick={() => handleDismissReport(report.id)} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold bg-green-600 hover:bg-green-700 text-white transition-colors"><CheckCircle size={16} /> Dismiss Report</button>
                      <button onClick={() => handleRemoveLayout(report.reportedLayout.id)} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold bg-yellow-600 hover:bg-yellow-700 text-white transition-colors"><Trash2 size={16} /> Remove Layout</button>
                      <button onClick={() => handleBanCreator(report.reportedLayout.creator.id, report.reportedLayout.creator.username)} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors"><UserX size={16} /> Ban Creator</button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 border-2 border-dashed border-gray-700 p-10 rounded-lg">
                <p className="text-2xl font-bold">The moderation queue is empty.</p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}