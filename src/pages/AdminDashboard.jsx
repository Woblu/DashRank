import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLanguage } from '../contexts/LanguageContext.jsx'; // 1. Import
import { Check, X, Clock, ThumbsUp, ThumbsDown, ShieldAlert, Trash2, UserX, CheckCircle, List } from 'lucide-react';
import { getEmbedUrl } from '../utils/embedUtils.js';
import { Link } from 'react-router-dom';
import ListManager from '../components/admin/ListManager';

export default function AdminDashboard() {
  const [submissions, setSubmissions] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('PENDING');
  const { token } = useAuth();
  const { t } = useLanguage(); // 2. Initialize

  // 3. Translated tabs object
  const tabs = [
    { id: 'PENDING', name: t('pending_submissions') },
    { id: 'LAYOUT_REPORTS', name: t('layout_reports') },
    { id: 'LIST_MANAGEMENT', name: t('list_management') },
    { id: 'APPROVED', name: t('approved_submissions') },
    { id: 'REJECTED', name: t('rejected_submissions') },
  ];

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
        setError(t('failed_to_load_data')); // Translated
        console.error("Failed to fetch admin data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab, token, t]); // Added t to dependency array

  const handleUpdateSubmission = async (submissionId, newStatus) => {
    try {
      await axios.post('/api/admin/update-submission', 
        { submissionId, newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSubmissions(prev => prev.filter(s => s.id !== submissionId));
    } catch (err) {
      alert(t('failed_to_update_submission')); // Translated
    }
  };
  
  // --- Layout Report Handlers ---
  const handleDismissReport = async (reportId) => {
     try {
      await axios.put('/api/admin/layout-reports', 
        { reportId, status: 'RESOLVED' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReports(prev => prev.filter(r => r.id !== reportId));
    } catch (err) {
      alert(t('failed_to_dismiss_report')); // Translated
    }
  };
  
  const handleRemoveLayout = async (layoutId) => {
    if (!window.confirm(t('are_you_sure_remove_layout'))) return;
     try {
      await axios.delete('/api/admin/layouts', 
        { 
          data: { layoutId },
          headers: { Authorization: `Bearer ${token}` } 
        }
      );
      setReports(prev => prev.filter(r => r.reportedLayoutId !== layoutId));
    } catch (err) {
      alert(t('failed_to_remove_layout')); // Translated
    }
  };
  
  const handleBanCreator = async (userIdToBan, username) => {
    if (!window.confirm(t('are_you_sure_ban_creator', { username: username }))) return;
     try {
      await axios.put('/api/admin/users/ban', 
        { userIdToBan },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(t('user_banned_success', { username: username })); // Translated
    } catch (err) {
      alert(t('failed_to_ban_user')); // Translated
    }
  };
  
  const getStatusIcon = (status) => {
    switch(status) {
      case 'PENDING': return <Clock className="w-5 h-5 text-yellow-400" />;
      case 'APPROVED': return <ThumbsUp className="w-5 h-5 text-green-400" />;
      case 'REJECTED': return <ThumbsDown className="w-5 h-5 text-red-400" />;
      default: return null;
    }
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h1 className="text-4xl font-bold text-text-primary mb-6">{t('admin_panel')}</h1>

      <div className="mb-6 border-b border-primary-bg"> {/* THEMED */}
        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg ${
                activeTab === tab.id
                  ? 'border-accent text-accent' // THEMED
                  : 'border-transparent text-text-muted hover:text-accent/80 hover:border-accent/50' // THEMED
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {loading && <p className="text-text-muted text-center">{t('loading_data')}</p>} {/* THEMED */}
      {error && <p className="text-center text-red-500">{error}</p>}

      {/* List Management Tab */}
      {activeTab === 'LIST_MANAGEMENT' && (
        <ListManager />
      )}

      {/* Submissions Tabs (Pending, Approved, Rejected) */}
      {['PENDING', 'APPROVED', 'REJECTED'].includes(activeTab) && !loading && (
        <div className="space-y-4">
          {submissions.length > 0 ? submissions.map(sub => (
            <div key={sub.id} className="p-4 bg-ui-bg rounded-lg shadow-inner border border-primary-bg"> {/* THEMED */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <h3 className="text-lg font-semibold text-text-on-ui">{sub.levelName}</h3> {/* THEMED */}
                  <p className="text-sm text-text-muted">{t('player')}: {sub.player}</p> {/* THEMED */}
                  <p className="text-sm text-text-muted">{t('percent')}: {sub.percent}%</p> {/* THEMED */}
                  <a href={sub.videoId} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline text-sm">{t('view_submission_video')}</a> {/* THEMED */}
                  {sub.rawFootageLink && <a href={sub.rawFootageLink} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline text-sm ml-4">{t('view_raw_footage')}</a>} {/* THEMED */}
                </div>
                <div className="flex items-center justify-center md:justify-end gap-2">
                  {activeTab === 'PENDING' ? (
                    <>
                      <button onClick={() => handleUpdateSubmission(sub.id, 'APPROVED')} className="p-2 rounded-full bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors" title={t('approve')}><Check className="w-6 h-6" /></button>
                      <button onClick={() => handleUpdateSubmission(sub.id, 'REJECTED')} className="p-2 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors" title={t('reject')}><X className="w-6 h-6" /></button>
                    </>
                  ) : (
                    getStatusIcon(sub.status)
                  )}
                </div>
              </div>
            </div>
          )) : (
            <div className="text-center text-text-muted border-2 border-dashed border-primary-bg p-10 rounded-lg"> {/* THEMED */}
              <p className="text-lg font-bold">{t('no_submissions_in_category')}</p> {/* Translated */}
            </div>
          )}
        </div>
      )}

      {/* Layout Reports Tab */}
      {activeTab === 'LAYOUT_REPORTS' && !loading && (
        <div className="space-y-4">
          {reports.length > 0 ? (
            reports.map(report => (
              <div key={report.id} className="bg-ui-bg rounded-lg shadow-inner p-4 border border-primary-bg"> {/* THEMED */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <h3 className="font-bold text-lg text-text-on-ui">{t('report_reason')}: <span className="font-normal italic">"{report.reason}"</span></h3> {/* THEMED */}
                    <Link to={`/layouts/${report.reportedLayout.id}`} className="text-accent hover:underline">{t('view_layout')}: {report.reportedLayout.levelName}</Link> {/* THEMED */}
                    <div className="text-sm text-text-muted space-x-4"> {/* THEMED */}
                      <span>{t('reported_by')}: {report.reporter.username}</span>
                      <span>{t('layout_creator')}: {report.reportedLayout.creator.username}</span>
                    </div>
                  </div>
                  <div className="md:col-span-1 flex flex-col justify-center gap-2">
                    <button onClick={() => handleDismissReport(report.id)} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold bg-green-600 hover:bg-green-700 text-white transition-colors"><CheckCircle size={16} /> {t('dismiss_report')}</button>
                    <button onClick={() => handleRemoveLayout(report.reportedLayout.id)} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold bg-yellow-600 hover:bg-yellow-700 text-white transition-colors"><Trash2 size={16} /> {t('remove_layout')}</button>
                    <button onClick={() => handleBanCreator(report.reportedLayout.creator.id, report.reportedLayout.creator.username)} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors"><UserX size={16} /> {t('ban_creator')}</button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-text-muted border-2 border-dashed border-primary-bg p-10 rounded-lg"> {/* THEMED */}
              <p className="text-2xl font-bold">{t('mod_queue_empty')}</p> {/* Translated */}
              <p className="text-text-muted">{t('mod_queue_empty_desc')}</p> {/* THEMED & Translated */}
            </div>
          )}
        </div>
      )}
    </div>
  );
}