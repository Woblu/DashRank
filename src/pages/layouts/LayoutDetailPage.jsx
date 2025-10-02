import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, Music, User, Tag, BarChartHorizontal, ShieldAlert, Send } from 'lucide-react';
import { getVideoEmbedUrl } from '../../utils/videoUtils.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import LayoutManagement from '../../components/LayoutManagement';

const difficultyColors = {
  EASY: 'text-green-400',
  MEDIUM: 'text-yellow-400',
  HARD: 'text-orange-400',
  INSANE: 'text-red-400',
  EXTREME: 'text-purple-400',
};

const ReportModal = ({ layout, onClose, reportReason, setReportReason, handleReportSubmit, reportError, reportSuccess }) => (
  <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg border border-gray-700" onClick={(e) => e.stopPropagation()}>
      <header className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold text-white">Report Layout: {layout.levelName}</h2>
      </header>
      <form onSubmit={handleReportSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-300 mb-2">Reason for reporting</label>
          <textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            required
            rows="5"
            placeholder="Please provide a detailed reason for your report (e.g., inappropriate content, stolen layout, etc.)."
            className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200"
          />
        </div>
        {reportError && <p className="text-red-400">{reportError}</p>}
        {reportSuccess && <p className="text-green-400">{reportSuccess}</p>}
        <div className="flex justify-end gap-4">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg font-semibold bg-gray-600 hover:bg-gray-500">Cancel</button>
          <button type="submit" className="px-4 py-2 rounded-lg font-semibold bg-red-600 hover:bg-red-700">Submit Report</button>
        </div>
      </form>
    </div>
  </div>
);

const ApplyModal = ({ layout, onClose, applicationMessage, setApplicationMessage, handleApplySubmit, applyError, applySuccess }) => (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg border border-gray-700" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Apply for: {layout.levelName}</h2>
        </header>
        <form onSubmit={handleApplySubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">Message (Optional)</label>
            <textarea
              value={applicationMessage}
              onChange={(e) => setApplicationMessage(e.target.value)}
              rows="5"
              placeholder="Include a short message to the layout creator..."
              className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200"
            />
          </div>
          {applyError && <p className="text-red-400 text-center">{applyError}</p>}
          {applySuccess && <p className="text-green-400 text-center">{applySuccess}</p>}
          <div className="flex justify-end gap-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg font-semibold bg-gray-600 hover:bg-gray-500">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-lg font-semibold bg-cyan-600 hover:bg-cyan-700 flex items-center gap-2">
                <Send size={16} /> Submit Application
            </button>
          </div>
        </form>
      </div>
    </div>
);


export default function LayoutDetailPage() {
  const { layoutId } = useParams();
  const { user, token } = useAuth();
  const [layout, setLayout] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportError, setReportError] = useState('');
  const [reportSuccess, setReportSuccess] = useState('');

  // Apply Modal State
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [applyError, setApplyError] = useState('');
  const [applySuccess, setApplySuccess] = useState('');

  useEffect(() => {
    const fetchLayout = async () => {
      setIsLoading(true);
      try {
        const res = await axios.get(`/api/layouts/${layoutId}`);
        setLayout(res.data);
      } catch (err) {
        setError('Failed to load layout details.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLayout();
  }, [layoutId]);

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    setReportError('');
    setReportSuccess('');
    if (reportReason.length < 10) {
      setReportError('Please provide a more detailed reason.');
      return;
    }
    try {
      await axios.post('/api/layout-reports', 
        { layoutId: layout.id, reason: reportReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReportSuccess('Report submitted successfully. Thank you!');
      setTimeout(() => {
        setIsReportModalOpen(false);
        setReportReason('');
        setReportSuccess('');
      }, 2000);
    } catch (err) {
      setReportError(err.response?.data?.message || 'Failed to submit report.');
    }
  };
  
  const handleApplySubmit = async (e) => {
    e.preventDefault();
    setApplyError('');
    setApplySuccess('');
    try {
        await axios.post('/api/collaboration-requests',
            { layoutId: layout.id, message: applicationMessage },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        setApplySuccess('Application sent successfully!');
        setTimeout(() => {
            setIsApplyModalOpen(false);
            setApplicationMessage('');
        }, 2000);
    } catch (err) {
        setApplyError(err.response?.data?.message || 'Failed to submit application.');
    }
  };

  if (isLoading) return <p className="text-center text-gray-400 animate-pulse">Loading Layout...</p>;
  if (error) return <p className="text-center text-red-500">{error}</p>;
  if (!layout) return null;

  const isOwner = user?.username === layout.creator.username;
  const embedInfo = getVideoEmbedUrl(layout.videoUrl, window.location.hostname);

  return (
    <>
      {isReportModalOpen && (
        <ReportModal 
          layout={layout}
          onClose={() => setIsReportModalOpen(false)}
          reportReason={reportReason}
          setReportReason={setReportReason}
          handleReportSubmit={handleReportSubmit}
          reportError={reportError}
          reportSuccess={reportSuccess}
        />
      )}
      {isApplyModalOpen && (
        <ApplyModal 
            layout={layout}
            onClose={() => setIsApplyModalOpen(false)}
            applicationMessage={applicationMessage}
            setApplicationMessage={setApplicationMessage}
            handleApplySubmit={handleApplySubmit}
            applyError={applyError}
            applySuccess={applySuccess}
        />
      )}

      <div className="max-w-5xl mx-auto text-white">
        <div className="mb-6">
          <Link to="/layouts" className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors">
            <ChevronLeft size={20} />
            Back to Layout Gallery
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 mb-4">
               <h1 className="text-4xl font-bold mb-2">{layout.levelName}</h1>
               <p className="text-gray-400">{layout.description || "No description provided."}</p>
            </div>
            <div className="aspect-video w-full bg-black rounded-xl">
              {embedInfo ? (
                <iframe
                  width="100%" height="100%"
                  src={embedInfo.url}
                  title="Layout Video"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="rounded-xl shadow-lg"
                ></iframe>
              ) : <div className="w-full h-full rounded-xl bg-gray-900 flex items-center justify-center"><p>Video preview not available.</p></div>}
            </div>
          </div>
          
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
              <h2 className="text-xl font-bold mb-4 border-b border-gray-700 pb-2">Details</h2>
              <div className="space-y-3 text-gray-300">
                <p className="flex items-center gap-2"><User size={16} className="text-cyan-400"/> <strong>Creator:</strong> {layout.creator.username}</p>
                <p className="flex items-center gap-2"><Music size={16} className="text-cyan-400"/> <strong>Song:</strong> {layout.songName || 'N/A'}</p>
                <p className="flex items-center gap-2"><BarChartHorizontal size={16} className="text-cyan-400"/> <strong className={difficultyColors[layout.difficulty]}>Difficulty:</strong> {layout.difficulty}</p>
              </div>
            </div>
            <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Tag/> Tags</h2>
              <div className="flex flex-wrap gap-2">
                {layout.tags?.length > 0 ? layout.tags.map(tag => (
                  <span key={tag} className="text-sm bg-gray-700 text-gray-300 px-3 py-1 rounded-full">{tag}</span>
                )) : <p className="text-sm text-gray-500">No tags provided.</p>}
              </div>
            </div>
            <button 
              onClick={() => setIsApplyModalOpen(true)}
              disabled={isOwner}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-cyan-500/20 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {isOwner ? "This is your layout" : "Request to Decorate"}
            </button>
            <button onClick={() => setIsReportModalOpen(true)} className="w-full flex items-center justify-center gap-2 bg-red-900/50 hover:bg-red-900/80 text-red-400 font-bold py-2 px-4 rounded-lg">
              <ShieldAlert size={16} /> Report Layout
            </button>
          </div>
        </div>
        {/* ** THE FIX IS HERE ** */}
        {isOwner && <LayoutManagement layoutId={layout.id} layoutCreatorId={layout.creatorId} />}
      </div>
    </>
  );
}