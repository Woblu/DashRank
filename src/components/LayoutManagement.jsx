// src/components/LayoutManagement.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Check, X, Plus, Trash2, User, Circle, CheckCircle2, UserX } from 'lucide-react';
import GroupChat from './GroupChat';

function ApplicantCard({ applicant, onUpdate }) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center justify-between p-4 bg-primary-bg rounded-lg">
      <div>
        <p className="font-bold text-text-primary">{applicant.applicant.username}</p>
        <p className="text-sm text-text-muted mt-1 italic">"{applicant.message || t('no_message_provided')}"</p>
      </div>
      <div className="flex gap-2">
        <button 
          onClick={() => onUpdate(applicant.id, 'ACCEPTED')}
          className="p-2 bg-green-500/20 hover:bg-green-500/40 text-green-400 rounded-full transition-colors"
          aria-label={t('accept')}
        >
          <Check size={20} />
        </button>
        <button 
          onClick={() => onUpdate(applicant.id, 'REJECTED')}
          className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-full transition-colors"
          aria-label={t('decline')}
        >
          <UserX size={20} />
        </button>
      </div>
    </div>
  );
}

export default function LayoutManagement({ layout }) {
  const { t } = useLanguage();
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState('management');
  
  const [applicants, setApplicants] = useState([]);
  const [parts, setParts] = useState([]);
  const [team, setTeam] = useState([]);
  
  const [partName, setPartName] = useState('');
  const [partStart, setPartStart] = useState('');
  const [partEnd, setPartEnd] = useState('');
  
  // [FIX] Use user.id here
  const layoutCreatorId = layout.creator.id;
  const isTeamMember = team.some(member => member.id === user?.id) || layoutCreatorId === user?.id;

  const tabs = [
    { id: 'management', name: t('management') },
    { id: 'applicants', name: t('applicants') },
    { id: 'team_chat', name: t('team_chat') },
  ];

  const fetchData = async () => {
    try {
      const [applicantsRes, partsTeamRes] = await Promise.all([
        axios.get(`/api/layouts/${layout.id}/applicants`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`/api/layouts/${layout.id}/parts-and-team`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setApplicants(applicantsRes.data);
      setParts(partsTeamRes.data.parts);
      setTeam(partsTeamRes.data.team);
    } catch (err) {
      console.error('Failed to fetch layout management data', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [layout.id, token]);
  
  const handleUpdateApplicant = async (requestId, status) => {
    try {
      await axios.put('/api/collaboration-requests/update', { requestId, status }, { headers: { Authorization: `Bearer ${token}` } });
      fetchData();
    } catch (err) {
      alert(t('failed_to_update_applicant'));
    }
  };
  
  const handleCreatePart = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/parts/create', { layoutId: layout.id, name: partName, startPercent: Number(partStart), endPercent: Number(partEnd) }, { headers: { Authorization: `Bearer ${token}` } });
      setPartName(''); setPartStart(''); setPartEnd('');
      fetchData();
    } catch (err) {
      alert(t('failed_to_create_part'));
    }
  };
  
  const handleAssignPart = async (partId, assigneeId) => {
    try {
      await axios.put('/api/parts/assign', { partId, assigneeId: assigneeId || null }, { headers: { Authorization: `Bearer ${token}` } });
      fetchData();
    } catch (err) {
      alert(t('failed_to_assign_part'));
    }
  };
  
  const handleUpdatePartStatus = async (partId, status) => {
    try {
      await axios.put('/api/parts/status', { partId, status }, { headers: { Authorization: `Bearer ${token}` } });
      fetchData();
    } catch (err) {
      alert(t('failed_to_update_status'));
    }
  };
  
  const handleDeletePart = async (partId) => {
    if (!window.confirm(t('part_delete_confirm'))) return;
    try {
      await axios.delete('/api/parts/delete', { data: { partId }, headers: { Authorization: `Bearer ${token}` } });
      fetchData();
    } catch (err) {
      alert(t('failed_to_delete_part'));
    }
  };

  return (
    <div className="bg-ui-bg/80 backdrop-blur-sm p-6 rounded-xl shadow-2xl border border-primary-bg mb-8">
      <h2 className="text-3xl font-bold text-center mb-6 text-text-on-ui">{t('layout_dashboard')}</h2>

      <div className="mb-6 border-b border-primary-bg">
        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg ${
                activeTab === tab.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-muted hover:text-accent/80 hover:border-accent/50'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      <div>
        {activeTab === 'management' && (
          <div className="space-y-6">
            <form onSubmit={handleCreatePart} className="p-4 bg-primary-bg rounded-lg space-y-3">
              <h3 className="text-lg font-semibold text-text-primary">{t('add_new_part')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input type="text" value={partName} onChange={(e) => setPartName(e.target.value)} placeholder={t('part_name')} required className="md:col-span-2 w-full p-2 rounded-lg border border-primary-bg bg-ui-bg text-text-on-ui" />
                <input type="number" value={partStart} onChange={(e) => setPartStart(e.target.value)} placeholder={t('start_percent')} required className="w-full p-2 rounded-lg border border-primary-bg bg-ui-bg text-text-on-ui" />
                <input type="number" value={partEnd} onChange={(e) => setPartEnd(e.target.value)} placeholder={t('end_percent')} required className="w-full p-2 rounded-lg border border-primary-bg bg-ui-bg text-text-on-ui" />
                <button type="submit" className="md:col-span-4 w-full flex items-center justify-center gap-2 bg-accent hover:opacity-90 text-text-on-ui font-bold py-2 px-4 rounded-lg">
                  <Plus size={18} /> {t('add')}
                </button>
              </div>
            </form>
            
            <div className="space-y-3">
              {parts.length > 0 ? parts.map(part => {
                // [FIX] Use user.id here
                const canManageStatus = user?.id === part.assigneeId || user?.id === layoutCreatorId;
                return (
                  <div key={part.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-3 bg-primary-bg rounded-lg">
                    <div className="flex items-center gap-2">
                      {part.status === 'COMPLETED' ? <CheckCircle2 size={18} className="text-green-400" /> : <Circle size={18} className="text-text-muted" />}
                      <span className="font-semibold text-text-primary">{part.name}</span>
                      <span className="text-sm text-text-muted">({part.startPercent}% - {part.endPercent}%)</span>
                    </div>
                    <div>
                      {/* [FIX] Use user.id here */}
                      <select value={part.assigneeId || ''} onChange={(e) => handleAssignPart(part.id, e.target.value)} disabled={user?.id !== layoutCreatorId} className="w-full p-2 rounded-lg border border-primary-bg bg-ui-bg text-text-on-ui disabled:opacity-50 disabled:cursor-not-allowed">
                        <option value="">{t('unassigned')}</option>
                        {team.map(member => <option key={member.id} value={member.id}>{member.username}</option>)}
                      </select>
                    </div>
                    <div className="flex justify-end gap-2">
                      {part.status === 'ASSIGNED' && <button onClick={() => handleUpdatePartStatus(part.id, 'COMPLETED')} disabled={!canManageStatus} className="px-3 py-1 text-xs rounded-full bg-green-500/20 hover:bg-green-500/40 text-green-400 disabled:opacity-50 disabled:cursor-not-allowed">{t('complete')}</button>}
                      {part.status === 'COMPLETED' && <button onClick={() => handleUpdatePartStatus(part.id, 'ASSIGNED')} disabled={!canManageStatus} className="px-3 py-1 text-xs rounded-full bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed">{t('reopen')}</button>}
                      {/* [FIX] Use user.id here */}
                      {user?.id === layoutCreatorId && <button onClick={() => handleDeletePart(part.id)} className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-full"><Trash2 size={16} /></button>}
                    </div>
                  </div>
                )
              }) : <p className="text-text-muted text-center italic">{t('no_parts_defined')}</p>}
            </div>
          </div>
        )}
        
        {activeTab === 'applicants' && (
          <div className="space-y-3">
            {applicants.length > 0 ? applicants.map(app => (
              <ApplicantCard key={app.id} applicant={app} onUpdate={handleUpdateApplicant} />
            )) : (
              <p className="text-text-muted text-center italic">{t('no_pending_applicants')}</p>
            )}
          </div>
        )}

        {activeTab === 'team_chat' && (
          isTeamMember ? (
            <GroupChat layoutId={layout.id} />
          ) : (
            <p className="text-text-muted text-center italic">{t('chat_not_member')}</p>
          )
        )}
      </div>
    </div>
  );
}