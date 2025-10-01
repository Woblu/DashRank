import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { ShieldAlert, Trash2, UserX, CheckCircle } from 'lucide-react';

export default function AdminReportsPage() {
  const { token } = useAuth();
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get('/api/admin/layout-reports', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReports(res.data);
    } catch (err) {
      setError('Failed to load reports. You may not have administrator privileges.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchReports();
    }
  }, [token]);

  const handleDismissReport = async (reportId) => {
    if (!window.confirm('Are you sure you want to dismiss this report? This will mark it as resolved.')) {
      return;
    }
    try {
      await axios.put(
        '/api/admin/layout-reports',
        { reportId: reportId, status: 'RESOLVED' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchReports();
    } catch (err) {
      alert('Failed to dismiss report.');
      console.error(err);
    }
  };

  const handleRemoveLayout = async (layoutId) => {
    if (!window.confirm('Are you sure you want to permanently delete this layout? This action cannot be undone.')) {
      return;
    }
    try {
      await axios.delete(
        '/api/admin/layouts',
        { 
          headers: { Authorization: `Bearer ${token}` },
          data: { layoutId: layoutId }
        }
      );
      fetchReports();
    } catch (err) {
      alert('Failed to remove layout.');
      console.error(err);
    }
  };

  const handleBanCreator = async (userIdToBan) => {
    if (!window.confirm('Are you sure you want to ban this user from the Creator\'s Workshop? They will no longer be able to submit new layouts.')) {
      return;
    }
    try {
      await axios.put(
        '/api/admin/users/ban',
        { userIdToBan: userIdToBan },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('User has been banned from the workshop.');
      // Optionally, you could also auto-dismiss reports from this user here.
      // For now, we'll just refresh the list.
      fetchReports();
    } catch (err) {
      alert('Failed to ban user.');
      console.error(err);
    }
  };

  if (isLoading) return <p className="text-center text-gray-400 animate-pulse">Loading Reports...</p>;
  if (error) return <p className="text-center text-red-500">{error}</p>;

  return (
    <div className="max-w-7xl mx-auto text-white">
      <div className="text-center border-b-2 border-dotted border-gray-700 pb-8 mb-8">
        <h1 className="text-5xl font-bold text-white drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">
          Moderation Queue
        </h1>
        <p className="text-gray-400 mt-4">Pending Layout Reports</p>
      </div>

      <div className="space-y-4">
        {reports.length > 0 ? (
          reports.map(report => (
            <div key={report.id} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Report Details */}
                <div className="md:col-span-2 space-y-2">
                  <h3 className="text-xl font-bold text-red-400 flex items-center gap-2">
                    <ShieldAlert /> Report for: <Link to={`/layouts/${report.reportedLayout.id}`} className="text-cyan-400 hover:underline">{report.reportedLayout.levelName}</Link>
                  </h3>
                  <p className="text-gray-300 bg-gray-900/50 p-3 rounded-md"><strong>Reason:</strong> {report.reason}</p>
                  <div className="text-xs text-gray-500 pt-2">
                    <span>Reported by: {report.reporter.username}</span> | <span>Layout by: {report.reportedLayout.creator.username}</span>
                  </div>
                </div>

                {/* Admin Actions */}
                <div className="md:col-span-1 flex flex-col justify-center gap-2">
                  <button 
                    onClick={() => handleDismissReport(report.id)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold bg-green-600 hover:bg-green-700 text-white transition-colors"
                  >
                    <CheckCircle size={16} /> Dismiss Report
                  </button>
                  <button 
                    onClick={() => handleRemoveLayout(report.reportedLayout.id)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold bg-yellow-600 hover:bg-yellow-700 text-white transition-colors"
                  >
                    <Trash2 size={16} /> Remove Layout
                  </button>
                  <button 
                    onClick={() => handleBanCreator(report.reportedLayout.creator.id)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors"
                  >
                    <UserX size={16} /> Ban Creator
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500">The moderation queue is empty.</p>
        )}
      </div>
    </div>
  );
}