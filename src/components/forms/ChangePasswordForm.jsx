// src/components/forms/ChangePasswordForm.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function ChangePasswordForm() {
  const { token } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);
    try {
      const response = await axios.post('/api/account/change-password', 
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess(response.data.message);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-red-400 text-center">{error}</div>}
      {success && <div className="text-green-400 text-center">{success}</div>}
      <div>
        <label htmlFor="currentPassword" className="block text-sm font-bold text-gray-300 mb-2">Current Password</label>
        <input type="password" id="currentPassword" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200" />
      </div>
      <div>
        <label htmlFor="newPassword" className="block text-sm font-bold text-gray-300 mb-2">New Password</label>
        <input type="password" id="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200" />
      </div>
      <button type="submit" disabled={isSubmitting} className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-800 text-white font-bold py-2 px-4 rounded-lg">
        {isSubmitting ? 'Saving...' : 'Change Password'}
      </button>
    </form>
  );
}