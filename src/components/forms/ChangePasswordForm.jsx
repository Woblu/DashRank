import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

export default function ChangePasswordForm() {
  const { token } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await axios.put(
        '/api/account', 
        {
          action: 'change-password', // Specify the action for the consolidated endpoint
          currentPassword,
          newPassword,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSuccess('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg">
      <header className="p-4 border-b border-gray-700"><h2 className="text-xl font-bold">Change Password</h2></header>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-300 mb-2">Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200"
            disabled={isSubmitting}
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-300 mb-2">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200"
            disabled={isSubmitting}
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-300 mb-2">Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200"
            disabled={isSubmitting}
          />
        </div>
        
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {success && <p className="text-green-400 text-sm">{success}</p>}
        
        <button type="submit" disabled={isSubmitting} className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-800 text-white font-bold py-2 px-4 rounded-lg">
          {isSubmitting ? 'Saving...' : 'Save Password'}
        </button>
      </form>
    </div>
  );
}