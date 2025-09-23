import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { PlusCircle, Trash2, Film, Pencil } from 'lucide-react';
import AddPersonalRecordForm from '../../components/AddPersonalRecordForm.jsx'; // Import the form

// Helper function to extract YouTube video ID from various URL formats
const getYouTubeId = (url) => {
  if (!url) return null;
  const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

export default function MyProgressPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();
  
  // State to manage the modal and the record being edited
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState(null);

  const apiEndpoint = '/api/personal-records';

  const fetchRecords = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await axios.get(apiEndpoint, { headers: { Authorization: `Bearer ${token}` } });
      setRecords(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [token]);

  const handleDelete = async (recordId) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      await axios.delete(apiEndpoint, {
        headers: { Authorization: `Bearer ${token}` },
        data: { recordId }
      });
      fetchRecords(); // Refresh list after deleting
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete record.');
    }
  };

  // Handlers to open the modal for adding or editing
  const handleOpenAddModal = () => {
    setRecordToEdit(null); // Ensure we're not editing
    setIsModalOpen(true);
  };
  
  const handleOpenEditModal = (record) => {
    setRecordToEdit(record);
    setIsModalOpen(true);
  };
  
  return (
    <div className="space-y-8">
      {/* Conditionally render the modal */}
      {isModalOpen && (
        <AddPersonalRecordForm
          onClose={() => setIsModalOpen(false)}
          onRecordAdded={fetchRecords}
          recordCount={records.length}
          existingRecord={recordToEdit}
        />
      )}

      <div className="bg-gray-800 border border-gray-700 rounded-lg">
        <header className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-2xl font-bold">My Completed Demons</h2>
          <button onClick={handleOpenAddModal} className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg">
            <PlusCircle className="w-5 h-5" /> Add New
          </button>
        </header>
        <div className="p-6 space-y-3">
          {loading ? <p className="text-center text-gray-400">Loading records...</p> : records.length > 0 ? records.map(record => {
            const youTubeId = getYouTubeId(record.videoUrl);
            const recordThumbnail = record.thumbnailUrl || (youTubeId ? `https://img.youtube.com/vi/${youTubeId}/mqdefault.jpg` : null);
            
            return (
              <div key={record.id} className="flex items-center bg-gray-900 p-3 rounded-lg gap-4">
                
                {recordThumbnail && (
                  <a href={record.videoUrl} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                    <img 
                      src={recordThumbnail} 
                      alt={`${record.levelName} thumbnail`}
                      className="w-32 h-20 object-cover rounded hover:opacity-80 transition-opacity"
                      onError={(e) => { e.target.parentElement.style.display = 'none'; }}
                    />
                  </a>
                )}

                <div className="flex-grow">
                  <p className="font-bold text-lg text-cyan-400">#{record.placement} - {record.levelName}</p>
                  <p className="text-sm text-gray-400">{record.difficulty.replace('_', ' ')} Demon {record.attempts ? `- ${record.attempts} attempts` : ''}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs">
                    <a href={record.videoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-gray-300 hover:text-cyan-400 transition-colors"><Film className="w-4 h-4" /> Video Proof</a>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-1">
                  <button onClick={() => handleOpenEditModal(record)} className="p-2 text-gray-300 hover:bg-gray-700 rounded-full transition-colors"><Pencil className="w-5 h-5" /></button>
                  <button onClick={() => handleDelete(record.id)} className="p-2 text-red-500 hover:bg-red-500/20 rounded-full transition-colors"><Trash2 className="w-5 h-5" /></button>
                </div>
              </div>
            );
          }) : <p className="text-gray-400 text-center">You haven't added any personal records yet.</p>}
        </div>
      </div>
    </div>
  );
}