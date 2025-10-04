import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

// ** THE FIX IS HERE: Updated the list of options **
const LIST_NAMES = [
  'main-list', 
  'unrated-list', 
  'platformer-list', 
  'speedhack-list', 
  'challenge-list', 
  'future-list'
];

const AddLevelModal = ({ listName, onClose, onLevelAdded }) => {
    const { token } = useAuth();
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
                levelData,
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
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg border border-gray-700">
                <header className="p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">Add Level to "{listName}"</h2>
                </header>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <input name="name" value={levelData.name} onChange={handleInputChange} placeholder="Level Name" required className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700" />
                    <input name="creator" value={levelData.creator} onChange={handleInputChange} placeholder="Creator(s)" required className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700" />
                    <input name="verifier" value={levelData.verifier} onChange={handleInputChange} placeholder="Verifier" required className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700" />
                    <input name="videoId" value={levelData.videoId} onChange={handleInputChange} placeholder="YouTube Video ID" required className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700" />
                    <input type="number" name="levelId" value={levelData.levelId} onChange={handleInputChange} placeholder="Level ID" required className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700" />
                    <input type="number" value={placement} onChange={(e) => setPlacement(e.target.value)} placeholder="Placement" required min="1" className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700" />
                    
                    {error && <p className="text-red-400">{error}</p>}
                    <div className="flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg font-semibold bg-gray-600 hover:bg-gray-500">Cancel</button>
                        <button type="submit" disabled={isLoading} className="px-4 py-2 rounded-lg font-semibold bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-500">{isLoading ? 'Adding...' : 'Add Level'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default function ListManager() {
    const { token } = useAuth();
    const [selectedList, setSelectedList] = useState(LIST_NAMES[0]);
    const [levels, setLevels] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchLevels = async () => {
        if (!selectedList) return;
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

    const handleRemove = async (levelId) => {
        if (!window.confirm("Are you sure you want to remove this level?")) return;
        try {
            await axios.delete('/api/admin/remove-level', {
                headers: { Authorization: `Bearer ${token}` },
                data: { levelId }
            });
            fetchLevels();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to remove level.');
        }
    };
    
    const handleMove = async (levelId, newPlacement) => {
        if (newPlacement < 1) return;
        try {
            await axios.put('/api/admin/move-level', 
                { levelId, newPlacement },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            fetchLevels();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to move level.');
        }
    };

    return (
        <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
            {isModalOpen && <AddLevelModal listName={selectedList} onClose={() => setIsModalOpen(false)} onLevelAdded={fetchLevels} />}
            <h2 className="text-2xl font-bold mb-4">Demonlist Management</h2>
            <div className="flex justify-between items-center mb-4">
                <select value={selectedList} onChange={(e) => setSelectedList(e.target.value)} className="p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200">
                    {LIST_NAMES.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
                <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-cyan-600 hover:bg-cyan-700">
                    <Plus size={18} /> Add New Level
                </button>
            </div>

            {isLoading && <p className="animate-pulse">Loading levels...</p>}
            {error && <p className="text-red-500">{error}</p>}
            
            {!isLoading && !error && (
                <div className="space-y-2">
                    {levels.map((level) => (
                        <div key={level.id} className="grid grid-cols-12 gap-4 items-center p-3 bg-gray-700/50 rounded-lg">
                            <span className="font-bold text-lg text-cyan-400 col-span-1">#{level.placement}</span>
                            <span className="col-span-6">{level.name}</span>
                            <span className="text-gray-400 col-span-3">by {level.creator}</span>
                            <div className="flex justify-end items-center gap-2 col-span-2">
                                <button onClick={() => handleMove(level.id, level.placement - 1)} className="p-1 hover:bg-gray-600 rounded-full"><ChevronUp size={20} /></button>
                                <button onClick={() => handleMove(level.id, level.placement + 1)} className="p-1 hover:bg-gray-600 rounded-full"><ChevronDown size={20} /></button>
                                <button onClick={() => handleRemove(level.id)} className="p-1 text-red-400 hover:bg-red-500/20 rounded-full"><Trash2 size={18} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}