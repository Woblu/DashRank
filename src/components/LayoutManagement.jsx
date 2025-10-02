import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Check, X, Plus, Trash2, User, Circle, CheckCircle2 } from 'lucide-react';
import GroupChat from './GroupChat';

// A single applicant card component
function ApplicantCard({ applicant, onUpdate }) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
      <div>
        <p className="font-bold text-white">{applicant.applicant.username}</p>
        <p className="text-sm text-gray-400 mt-1 italic">"{applicant.message || 'No message provided.'}"</p>
      </div>
      <div className="flex gap-2">
        <button 
          onClick={() => onUpdate(applicant.id, 'ACCEPTED')}
          className="p-2 bg-green-500/20 hover:bg-green-500/40 text-green-400 rounded-full transition-colors"
          aria-label="Accept"
        >
          <Check size={20} />
        </button>
        <button 
          onClick={() => onUpdate(applicant.id, 'REJECTED')}
          className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-full transition-colors"
          aria-label="Decline"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}

// Form for creating a new part
function CreatePartForm({ layoutId, onPartCreated }) {
  const { token } = useAuth();
  const [startPercent, setStartPercent] = useState('');
  const [endPercent, setEndPercent] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (parseInt(startPercent, 10) >= parseInt(endPercent, 10)) {
        setError('Start % must be less than End %.');
        return;
    }
    try {
        await axios.post('/api/parts/create', 
            { layoutId, startPercent, endPercent, description }, 
            { headers: { Authorization: `Bearer ${token}` } }
        );
        onPartCreated();
        setStartPercent('');
        setEndPercent('');
        setDescription('');
    } catch (err) {
        setError(err.response?.data?.message || 'Failed to create part.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-gray-900/50 rounded-lg space-y-3 mb-6">
      <h3 className="text-lg font-semibold text-white">Add New Part</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <input type="number" value={startPercent} onChange={(e) => setStartPercent(e.target.value)} placeholder="Start %" required className="p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200" />
        <input type="number" value={endPercent} onChange={(e) => setEndPercent(e.target.value)} placeholder="End %" required className="p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200" />
        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (e.g., 'First wave')" className="md:col-span-2 p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200" />
      </div>
      <button type="submit" className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold bg-cyan-600 hover:bg-cyan-700 text-white transition-colors">
        <Plus size={18} /> Add Part
      </button>
      {error && <p className="text-red-400 text-center text-sm">{error}</p>}
    </form>
  );
}


// The main management panel
export default function LayoutManagement({ layoutId, layoutCreatorId }) {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState('applicants');
  
  const [applicants, setApplicants] = useState([]);
  const [parts, setParts] = useState([]);
  const [team, setTeam] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    if (activeTab === 'chat') {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    setError('');
    try {
      if (activeTab === 'applicants') {
        const res = await axios.get(`/api/layouts/${layoutId}/applicants`, { headers: { Authorization: `Bearer ${token}` } });
        setApplicants(res.data || []);
      } else if (activeTab === 'parts') {
        const res = await axios.get(`/api/layouts/${layoutId}/parts-and-team`, { headers: { Authorization: `Bearer ${token}` } });
        // ** THE FIX IS HERE **
        setParts(res.data.parts || []);
        setTeam(res.data.team || []);
      }
    } catch (err) {
      setError(`Failed to load ${activeTab}.`);
      setParts([]); // Also reset on error to be safe
      setTeam([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [layoutId, activeTab]);
  
  const handleUpdateRequest = async (requestId, status) => {
    try {
      await axios.put('/api/collaboration-requests/update', { requestId, status }, { headers: { Authorization: `Bearer ${token}` } });
      fetchData();
    } catch (err) { alert(`Error: ${err.response?.data?.message || 'Could not update status'}`); }
  };
  
  const handleAssignPart = async (partId, assigneeId) => {
    try {
      await axios.put('/api/parts/assign', { partId, assigneeId }, { headers: { Authorization: `Bearer ${token}` } });
      fetchData();
    } catch (err) { alert(`Error: ${err.response?.data?.message || 'Could not assign part'}`); }
  };
  
  const handleUpdatePartStatus = async (partId, newStatus) => {
    try {
        await axios.put('/api/parts/status', { partId, status: newStatus }, { headers: { Authorization: `Bearer ${token}` }});
        fetchData();
    } catch (err) { alert(`Error: ${err.response?.data?.message || 'Could not update part status'}`); }
  };

  const handleDeletePart = async (partId) => {
    if (window.confirm("Are you sure you want to delete this part?")) {
      try {
        await axios.delete('/api/parts/delete', { headers: { Authorization: `Bearer ${token}` }, data: { partId } });
        fetchData();
      } catch (err) { alert(`Error: ${err.response?.data?.message || 'Could not delete part'}`); }
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
        case 'COMPLETED': return <span className="text-xs font-bold inline-flex items-center gap-1 text-green-400"><CheckCircle2 size={14}/> COMPLETED</span>;
        case 'ASSIGNED': return <span className="text-xs font-bold inline-flex items-center gap-1 text-cyan-400"><Circle size={14}/> ASSIGNED</span>;
        default: return <span className="text-xs font-bold inline-flex items-center gap-1 text-gray-400"><Circle size={14}/> OPEN</span>;
    }
  };

  return (
    <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 mt-8">
      <h2 className="text-2xl font-bold mb-4">Creator Dashboard</h2>
      <div className="border-b border-gray-600 mb-6">
        <nav className="flex gap-4">
          <button onClick={() => setActiveTab('applicants')} className={`py-2 px-4 font-semibold ${activeTab === 'applicants' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400'}`}>Applicants</button>
          <button onClick={() => setActiveTab('parts')} className={`py-2 px-4 font-semibold ${activeTab === 'parts' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400'}`}>Team & Parts</button>
          <button onClick={() => setActiveTab('chat')} className={`py-2 px-4 font-semibold ${activeTab === 'chat' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400'}`}>Group Chat</button>
        </nav>
      </div>

      {isLoading && <p className="animate-pulse text-gray-400">Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!isLoading && !error && (
        <div>
          {activeTab === 'applicants' && ( <div className="space-y-4">{applicants.length > 0 ? applicants.map(app => <ApplicantCard key={app.id} applicant={app} onUpdate={handleUpdateRequest} />) : <p className="text-gray-500">No pending applicants.</p>}</div> )}
          {activeTab === 'parts' && (
            <div>
              <CreatePartForm layoutId={layoutId} onPartCreated={fetchData} />
              <div className="space-y-4">
                {parts.length > 0 ? parts.map(part => {
                  const canManageStatus = user?.userId === layoutCreatorId || user?.userId === part.assigneeId;
                  return (
                    <div key={part.id} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center p-4 bg-gray-700/50 rounded-lg">
                      <div className="md:col-span-2">
                        <p className="font-bold text-white">{part.startPercent}% - {part.endPercent}%</p>
                        <p className="text-sm text-gray-400">{part.description || 'No description.'}</p>
                      </div>
                      <div>{getStatusBadge(part.status)}</div>
                      <div className="flex items-center gap-2">
                        <select value={part.assigneeId || ''} onChange={(e) => handleAssignPart(part.id, e.target.value)} disabled={user?.userId !== layoutCreatorId} className="w-full p-2 rounded-lg border border-gray-600 bg-gray-800 text-gray-200 disabled:opacity-50">
                          <option value="">Unassigned</option>
                          {team.map(member => <option key={member.id} value={member.id}>{member.username}</option>)}
                        </select>
                      </div>
                      <div className="flex justify-end gap-2">
                        {part.status === 'ASSIGNED' && <button onClick={() => handleUpdatePartStatus(part.id, 'COMPLETED')} disabled={!canManageStatus} className="px-3 py-1 text-xs rounded-full bg-green-500/20 hover:bg-green-500/40 text-green-400 disabled:opacity-50 disabled:cursor-not-allowed">Complete</button>}
                        {part.status === 'COMPLETED' && <button onClick={() => handleUpdatePartStatus(part.id, 'ASSIGNED')} disabled={!canManageStatus} className="px-3 py-1 text-xs rounded-full bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed">Re-open</button>}
                        {user?.userId === layoutCreatorId && <button onClick={() => handleDeletePart(part.id)} className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-full"><Trash2 size={16} /></button>}
                      </div>
                    </div>
                  )
                }) : <p className="text-gray-500">No parts defined yet. Add one above.</p>}
              </div>
            </div>
          )}
          {activeTab === 'chat' && <GroupChat layoutId={layoutId} />}
        </div>
      )}
    </div>
  );
}