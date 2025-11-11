import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext'; // 1. Import
import { Plus, Trash2, ChevronUp, ChevronDown, X } from 'lucide-react';

const LIST_NAMES = [
  'main-list', 'unrated-list', 'platformer-list', 
  'speedhack-list', 'challenge-list', 'future-list'
];

const AddLevelModal = ({ listName, onClose, onLevelAdded }) => {
    const { token } = useAuth();
    const { t } = useLanguage(); // 2. Initialize
    const [levelData, setLevelData] = useState({ name: '', creator: '', verifier: '', videoId: '', levelId: '' });
    const [placement, setPlacement] = useState(1);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setLevelData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await axios.post('/api/admin/add-level', {
                ...levelData, // Spread levelData here
                list: listName,
                placement: parseInt(placement, 10),
            }, { headers: { Authorization: `Bearer ${token}` } });
            onLevelAdded();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add level.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-ui-bg rounded-xl shadow-2xl w-full max-w-lg border border-primary-bg" onClick={(e) => e.stopPropagation()}> {/* THEMED */}
                <header className="p-4 border-b border-primary-bg flex justify-between items-center"> {/* THEMED */}
                    <h2 className="text-xl font-bold text-text-on-ui">{t('add_new_level_to', { listName: listName })}</h2> {/* THEMED & Translated */}
                    <button onClick={onClose} className="p-1 rounded-full text-text-on-ui hover:bg-primary-bg transition-colors"><X size={20}/></button> {/* THEMED */}
                </header>
                <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-text-on-ui/90 mb-2">{t('level_name')}</label> {/* THEMED */}
                        <input type="text" name="name" value={levelData.name} onChange={handleInputChange} required className="w-full p-2 rounded-lg border border-primary-bg bg-primary-bg text-text-primary" /> {/* THEMED */}
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-text-on-ui/90 mb-2">{t('creator')}</label> {/* THEMED */}
                        <input type="text" name="creator" value={levelData.creator} onChange={handleInputChange} required className="w-full p-2 rounded-lg border border-primary-bg bg-primary-bg text-text-primary" /> {/* THEMED */}
                    </div>
                     <div>
                        <label className="block text-sm font-bold text-text-on-ui/90 mb-2">{t('verifier')}</label> {/* THEMED */}
                        <input type="text" name="verifier" value={levelData.verifier} onChange={handleInputChange} required className="w-full p-2 rounded-lg border border-primary-bg bg-primary-bg text-text-primary" /> {/* THEMED */}
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-text-on-ui/90 mb-2">{t('video_url_or_id')}</label> {/* THEMED */}
                        <input type="text" name="videoId" value={levelData.videoId} onChange={handleInputChange} required className="w-full p-2 rounded-lg border border-primary-bg bg-primary-bg text-text-primary" /> {/* THEMED */}
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-text-on-ui/90 mb-2">{t('gd_level_id')}</label> {/* THEMED */}
                        <input type="text" name="levelId" value={levelData.levelId} onChange={handleInputChange} className="w-full p-2 rounded-lg border border-primary-bg bg-primary-bg text-text-primary" /> {/* THEMED */}
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-text-on-ui/90 mb-2">{t('placement')}</label> {/* THEMED */}
                        <input type="number" value={placement} onChange={(e) => setPlacement(e.target.value)} required min="1" className="w-full p-2 rounded-lg border border-primary-bg bg-primary-bg text-text-primary" /> {/* THEMED */}
                    </div>
                    
                    {error && <p className="md:col-span-2 text-red-400 text-center">{error}</p>}
                    
                    <div className="md:col-span-2 flex justify-end gap-4 mt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg font-semibold bg-primary-bg text-text-primary hover:bg-accent/20 transition-colors">{t('close')}</button> {/* THEMED */}
                        <button type="submit" disabled={isLoading} className="px-4 py-2 rounded-lg font-semibold bg-accent text-text-on-ui hover:opacity-90 transition-colors disabled:opacity-70"> {/* THEMED */}
                            {isLoading ? t('adding_level') : t('add_level')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default function ListManager() {
    const [selectedList, setSelectedList] = useState(LIST_NAMES[0]);
    const [levels, setLevels] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { token } = useAuth();
    const { t } = useLanguage(); // 2. Initialize

    const fetchLevels = async () => {
        setIsLoading(true);
        setError('');
        try {
            const res = await axios.get(`/api/lists/${selectedList}`);
            setLevels(res.data);
        } catch (err) {
            setError('Failed to fetch levels for this list.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLevels();
    }, [selectedList]);

    const handleMove = async (levelId, newPlacement) => {
        const levelToMove = levels.find(l => l.id === levelId);
        if (!levelToMove) return;

        // Prevent moving out of bounds
        if (newPlacement < 1 || newPlacement > levels.length) return;

        try {
            await axios.put('/api/admin/move-level', 
                { levelId, oldPlacement: levelToMove.placement, newPlacement, list: selectedList },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            fetchLevels(); // Refetch to get new order
        } catch (err) {
            alert('Failed to move level: ' + (err.response?.data?.message || 'Server error'));
        }
    };
    
    const handleRemove = async (levelId) => {
        if (!window.confirm('Are you sure you want to permanently remove this level from the list?')) return;
         try {
            await axios.delete('/api/admin/remove-level', 
                { 
                    data: { levelId },
                    headers: { Authorization: `Bearer ${token}` } 
                }
            );
            fetchLevels(); // Refetch
        } catch (err) {
            alert('Failed to remove level: ' + (err.response?.data?.message || 'Server error'));
        }
    };

    return (
        <div className="p-4 bg-ui-bg rounded-lg shadow-inner border border-primary-bg"> {/* THEMED */}
            {isModalOpen && <AddLevelModal listName={selectedList} onClose={() => setIsModalOpen(false)} onLevelAdded={fetchLevels} />}
            
            <header className="pb-4 border-b border-primary-bg flex justify-between items-center"> {/* THEMED */}
                <h2 className="text-2xl font-bold text-text-on-ui">{t('list_management')}</h2> {/* THEMED & Translated */}
                <div className="flex gap-4">
                    <select 
                        value={selectedList} 
                        onChange={(e) => setSelectedList(e.target.value)}
                        className="p-2 rounded-lg border border-primary-bg bg-primary-bg text-text-primary" /* THEMED */
                    >
                        <option value="" disabled>{t('select_list')}</option> {/* Translated */}
                        {LIST_NAMES.map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                    <button 
                        onClick={() => setIsModalOpen(true)} 
                        className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-accent text-text-on-ui hover:opacity-90 transition-colors" /* THEMED */
                    >
                        <Plus size={20} /> {t('add_level')} {/* Translated */}
                    </button>
                </div>
            </header>
            
            <div className="mt-4">
                {isLoading && <p className="animate-pulse text-text-muted">{t('loading_levels')}</p>} {/* THEMED & Translated */}
                {error && <p className="text-red-500">{error}</p>}
                
                {!isLoading && !error && (
                    <div className="space-y-2">
                        {/* List Header */}
                        <div className="grid grid-cols-12 gap-4 items-center p-3 text-text-muted font-bold text-sm"> {/* THEMED */}
                            <span className="col-span-1">#</span>
                            <span className="col-span-6">{t('level')}</span> {/* Translated */}
                            <span className="col-span-3">{t('creator')}</span> {/* Translated */}
                            <span className="col-span-2 text-right">{t('actions')}</span> {/* Translated */}
                        </div>
                        {levels.map((level) => (
                            <div key={level.id} className="grid grid-cols-12 gap-4 items-center p-3 bg-primary-bg rounded-lg"> {/* THEMED */}
                                <span className="font-bold text-lg text-accent col-span-1">#{level.placement}</span> {/* THEMED */}
                                <span className="col-span-6 text-text-primary">{level.name}</span> {/* THEMED */}
                                <span className="text-text-muted col-span-3">{level.creator}</span> {/* THEMED */}
                                <div className="flex justify-end items-center gap-2 col-span-2 text-text-primary"> {/* THEMED */}
                                    <button onClick={() => handleMove(level.id, level.placement - 1)} className="p-1 hover:bg-accent/20 rounded-full" disabled={level.placement === 1}><ChevronUp size={20} /></button> {/* THEMED */}
                                    <button onClick={() => handleMove(level.id, level.placement + 1)} className="p-1 hover:bg-accent/20 rounded-full" disabled={level.placement === levels.length}><ChevronDown size={20} /></button> {/* THEMED */}
                                    <button onClick={() => handleRemove(level.id)} className="p-1 text-red-400 hover:bg-red-500/20 rounded-full"><Trash2 size={18} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}