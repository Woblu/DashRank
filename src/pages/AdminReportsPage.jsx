import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, Trash2, UserX, CheckCircle, ChevronLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext'; // 1. Import

export default function AdminReportsPage() {
  const { token } = useAuth();
  const { t } = useLanguage(); // 2. Initialize
  const navigate = useNavigate();
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
      setError(t('reports_load_error')); // Translated
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
    if (!window.confirm(t('dismiss_report_confirm'))) { // Translated
      return;
    }
    try {
      await axios.put(
        '/api/admin/layout-reports',
        { reportId, status: 'RESOLVED' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReports(prev => prev.filter(r => r.id !== reportId));
    } catch (err) {
      alert(t('failed_to_dismiss_report')); // Translated
    }
  };

  const handleRemoveLayout = async (layoutId) => {
    if (!window.confirm(t('are_you_sure_remove_layout'))) { // Translated
      return;
    }
    try {
      await axios.delete('/api/admin/layouts', {
        data: { layoutId },
        headers: { Authorization: `Bearer ${token}` }
      });
      setReports(prev => prev.filter(r => r.reportedLayoutId !== layoutId));
    } catch (err) {
      alert(t('failed_to_remove_layout')); // Translated
    }
  };

  const handleBanCreator = async (creator) => {
    if (!window.confirm(t('are_you_sure_ban_creator', { username: creator.username }))) { // Translated
      return;
    }
    try {
      await axios.put(
        '/api/admin/users/ban',
        { userIdToBan: creator.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(t('user_banned_success', { username: creator.username })); // Translated
    } catch (err) {
      alert(t('failed_to_ban_user')); // Translated
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-text-primary flex items-center gap-2"> {/* THEMED */}
          <ShieldAlert className="w-8 h-8 text-accent" /> {/* THEMED */}
          {t('layout_reports')}
        </h1>
        <button 
          onClick={() => navigate('/admin')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-ui-bg text-text-on-ui hover:bg-primary-bg transition-colors" /* THEMED */
        >
          <ChevronLeft size={18} /> {t('go_back')}
        </button>
      </div>

      {isLoading && <p className="text-center text-text-muted">{t('loading_reports')}</p>} {/* THEMED */}
      {error && <p className="text-center text-red-500">{error}</p>}
      
      {!isLoading && !error && (
        <div className="space-y-4">
          {reports.length > 0 ? (
            reports.map((report) => (
              <div key={report.id} className="bg-ui-bg rounded-lg shadow-lg p-4 border border-primary-bg"> {/* THEMED */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Report Details */}
                  <div className="md:col-span-2 space-y-2">
                    <h3 className="font-bold text-lg text-text-on-ui">{t('report_reason')}: <span className="font-normal italic">"{report.reason}"</span></h3> {/* THEMED */}
                    <Link to={`/layouts/${report.reportedLayout.id}`} className="text-accent hover:underline">{t('view_layout')}: {report.reportedLayout.levelName}</Link> {/* THEMED */}
                    <div className="text-sm text-text-muted space-x-4"> {/* THEMED */}
                      <span>{t('reported_by')}: {report.reporter.username}</span>
                      <span>{t('layout_creator')}: {report.reportedLayout.creator.username}</span>
                    </div>
                  </div>
                  {/* Admin Actions */}
                  <div className="md:col-span-1 flex flex-col justify-center gap-2">
                    <button 
                      onClick={() => handleDismissReport(report.id)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold bg-green-600 hover:bg-green-700 text-white transition-colors"
                    >
                      <CheckCircle size={16} /> {t('dismiss_report')}
                    </button>
                    <button 
                      onClick={() => handleRemoveLayout(report.reportedLayout.id)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold bg-yellow-600 hover:bg-yellow-700 text-white transition-colors"
                    >
                      <Trash2 size={16} /> {t('remove_layout')}
                    </button>
                    <button 
                      onClick={() => handleBanCreator(report.reportedLayout.creator)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors"
                    >
                      <UserX size={16} /> {t('ban_creator')}
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-text-muted">{t('mod_queue_empty')}</p> /* THEMED */
          )}
        </div>
      )}
    </div>
  );
}