import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext.jsx';
import LevelCard from "../components/LevelCard";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import AddPersonalRecordForm from "../components/AddPersonalRecordForm";
import { PlusCircle, History, X } from 'lucide-react';
import LoadingSpinner from "../components/LoadingSpinner";

const listTitles = {
  main: "Main List", unrated: "Unrated List", platformer: "Platformer List",
  speedhack: "Speedhack List", future: "Future List", challenge: "Challenge List",
  progression: "Progression Tracker"
};

const HistoryModal = ({ onClose, onFetchHistory }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const { t } = useLanguage(); 

    const handleSubmit = (e) => {
        e.preventDefault();
        onFetchHistory(date);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
            <div className="bg-ui-bg rounded-xl shadow-2xl w-full max-w-sm border border-primary-bg" onClick={(e) => e.stopPropagation()}>
                <header className="p-4 border-b border-primary-bg flex justify-between items-center">
                    <h2 className="text-xl font-bold text-text-on-ui">{t('view_list_history')}</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-text-on-ui hover:bg-primary-bg"><X size={20}/></button>
                </header>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <p className="text-sm text-text-muted">
                        For simplicity, list history only started on <strong>October 4, 2025,</strong> and only works for the main list.
                    </p>
                    <div>
                        <label className="block text-sm font-bold text-text-on-ui/90 mb-2">{t('select_a_date')}</label>
                        <input 
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full p-2 rounded-lg border border-primary-bg bg-primary-bg text-text-primary"
                        />
                    </div>
                    <button type="submit" className="w-full px-4 py-2 rounded-lg font-semibold bg-accent hover:opacity-90 text-text-on-ui">
                      {t('view_history')}
                    </button>
                </form>
            </div>
        </div>
    );
};


export default function Home() {
  const location = useLocation();
  const { t } = useLanguage();
  const { user, token } = useAuth();
  const currentListType = location.pathname.startsWith('/progression') ? 'progression' : (location.pathname.substring(1) || "main");
  
  const [levels, setLevels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [historicDate, setHistoricDate] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  
  const [pinnedRecordId, setPinnedRecordId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState(null);

  // 1. ADD new state for progression tabs
  const [progressionTab, setProgressionTab] = useState('COMPLETED'); // 'COMPLETED' or 'IN_PROGRESS'

  useEffect(() => {
    if (user) {
      setPinnedRecordId(user.pinnedRecordId);
    }
  }, [user]);

  const fetchLevels = async () => {
    setIsLoading(true);
    setError(null);
    setSearch("");
    setHistoricDate(null);
    try {
      let response;
      if (currentListType === 'progression') {
        if (!token) { 
          setLevels([]); 
          setIsLoading(false);
          return; 
        }
        response = await axios.get('/api/personal-records', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const responseData = response.data.map((record) => ({
          ...record,
          id: record.id,
          name: record.levelName,
          creator: user.username,
          videoId: record.videoUrl,
          thumbnail: record.thumbnailUrl,
          records: [],
          list: 'progression',
          // status is already on the record
        }));
        setLevels(responseData);
      } else {
        const listName = `${currentListType}-list`;
        response = await axios.get(`/api/lists/${listName}`);
        setLevels(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch levels:", err);
      setError(`Failed to load '${listTitles[currentListType]}'. Please try again later.`);
      setLevels([]);
    } finally {
      setIsLoading(false);
    }
  };
  
const fetchHistoricList = async (date) => {
    setIsLoading(true);
    setError(null);
    setSearch("");
    try {
        // [FIX] Create a date object from the YYYY-MM-DD string
        // This will be in the user's local time, e.g., "2025-10-10T00:00:00" (local)
        const localDate = new Date(date + "T12:00:00");
        
        // [FIX] Convert the local date to a full ISO string (e.g., "2025-10-10T17:00:00.000Z")
        // This locks in the user's intended date in a universal format.
        const dateString = localDate.toISOString();

        // [FIX] Send this universal string to the API
        const response = await axios.get(`/api/lists/main-list/history?date=${dateString}`);
        
        // We set the historicDate from the *original* local date string
        setHistoricDate(new Date(date + "T12:00:00")); 
    } catch (err) {
        console.error("Failed to fetch historic list:", err);
        setError(`Failed to load history for ${date}.`);
        setLevels([]);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLevels();
  }, [currentListType, token]);
  
  // 2. UPDATE filteredLevels to check for progressionTab
  const filteredLevels = levels.filter(level => {
    // First, filter by status if on progression list
    if (currentListType === 'progression') {
      if (level.status !== progressionTab) {
        return false;
      }
    }
    // Then, filter by search term
    const searchTerm = search.toLowerCase();
    return (
      level.name.toLowerCase().includes(searchTerm) ||
      level.placement.toString().includes(searchTerm) ||
      (level.creator && level.creator.toLowerCase().includes(searchTerm)) ||
      (level.verifier && level.verifier.toLowerCase().includes(searchTerm))
    );
  });
  
  const handleOpenEditModal = (record) => {
    setRecordToEdit(record);
    setIsModalOpen(true);
  };
  
  // 3. UPDATE AddModal to pass the active tab's status
  const handleOpenAddModal = () => {
    setRecordToEdit(null);
    setIsModalOpen(true);
    // The modal will now get 'progressionTab' as 'initialStatus'
  };

  const handleDelete = async (recordId) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      await axios.delete('/api/personal-records', {
        headers: { Authorization: `Bearer ${token}` },
        data: { recordId }
      });
      fetchLevels();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete record.');
    }
  };

  const handlePinRecord = async (recordId) => {
    try {
      await axios.post('/api/users', { action: 'pin', recordId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPinnedRecordId(recordId);
    } catch(err) {
      alert(err.response?.data?.message || 'Failed to pin record.');
    }
  };
  
  // 4. Get the count for the *currently filtered* list for correct placement
  const currentTabRecordCount = levels.filter(lvl => lvl.status === progressionTab).length;

  return (
    <>
      {isHistoryModalOpen && <HistoryModal onClose={() => setIsHistoryModalOpen(false)} onFetchHistory={fetchHistoricList} />}
      <div className="min-h-screen flex flex-col items-center pt-6 px-4">
        <div className="w-full max-w-3xl flex justify-center items-center mb-4 relative">
          <h1 className="font-poppins text-4xl font-bold text-center text-accent capitalize break-words">
            {listTitles[currentListType]}
          </h1>
          {currentListType === 'progression' && user && (
            <button 
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-accent hover:opacity-90 text-text-on-ui transition-colors text-sm absolute right-0"
            >
              <PlusCircle className="w-5 h-5" /> {t('add_record')}
            </button>
          )}
        </div>
        
        {historicDate && (
            <div className="w-full max-w-3xl mb-4 p-3 bg-yellow-900/50 border border-yellow-700 rounded-lg flex justify-between items-center">
                <p className="font-semibold text-yellow-300">
                    {t('showing_list_as_of', { date: historicDate.toLocaleDateString() })}
                </p>
                <button onClick={fetchLevels} className="text-sm font-bold text-white hover:underline">
                  {t('return_to_live_list')}
                </button>
            </div>
        )}

        <div className="w-full max-w-3xl mb-6 flex gap-2">
          <input
            type="text"
            placeholder={t('search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-grow p-2 rounded-lg border border-primary-bg bg-ui-bg text-text-on-ui focus:outline-none focus:ring-2 focus:ring-accent"
          />
          {currentListType === 'main' && (
            <button 
              onClick={() => setIsHistoryModalOpen(true)} 
              title={t('view_list_history')}
              className="p-2 rounded-lg border border-primary-bg bg-ui-bg text-text-on-ui hover:bg-primary-bg"
            >
                <History className="w-5 h-5"/>
            </button>
          )}
        </div>
        
        {/* 5. ADD the new tabs here */}
        {currentListType === 'progression' && (
          <div className="w-full max-w-3xl mb-6 flex justify-center gap-4 border-b border-primary-bg">
            <button
              onClick={() => setProgressionTab('COMPLETED')}
              className={`py-3 px-4 font-semibold ${
                progressionTab === 'COMPLETED'
                  ? 'border-b-2 border-accent text-accent'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {t('completions')}
            </button>
            <button
              onClick={() => setProgressionTab('IN_PROGRESS')}
              className={`py-3 px-4 font-semibold ${
                progressionTab === 'IN_PROGRESS'
                  ? 'border-b-2 border-accent text-accent'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {t('runs')}
            </button>
          </div>
        )}

        <div className="flex flex-col gap-4 w-full max-w-3xl">
          {isLoading ? (
            <LoadingSpinner message={t('loading_list')} />
          ) : error ? (
            <p className="text-center text-red-500 mt-8">{error}</p>
          ) : filteredLevels.length > 0 ? (
            filteredLevels.map((level, index) => (
              <LevelCard 
                key={level.id || level.levelId || index} 
                level={level} 
                listType={currentListType}
                onEdit={handleOpenEditModal}
                onDelete={handleDelete}
                onPin={handlePinRecord}
                pinnedRecordId={pinnedRecordId}
              />
            ))
          ) : (
            <p className="text-center text-text-muted mt-8">
              {t('no_levels_found')}
            </p>
          )}
        </div>
      </div>
      {isModalOpen && (
        <AddPersonalRecordForm 
          // 6. Pass the correct count and status
          recordCount={currentTabRecordCount} 
          initialStatus={progressionTab}
          onClose={() => setIsModalOpen(false)} 
          onRecordAdded={fetchLevels}
          existingRecord={recordToEdit}
        />
      )}
    </>
  );
}