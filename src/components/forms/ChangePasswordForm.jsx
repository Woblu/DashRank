import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext'; // 1. Import

export default function ChangePasswordForm() {
  const { token } = useAuth();
  const { t } = useLanguage(); // 2. Initialize
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
      setError(t('passwords_do_not_match')); // Translated
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await axios.put(
        '/api/account', 
        {
          action: 'change-password',
          currentPassword,
          newPassword,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSuccess(t('password_update_success')); // Translated
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.message || t('password_update_failed')); // Translated
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // [FIX] Removed the outer card wrapper as the parent page provides it
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-bold text-text-on-ui/90 mb-2">{t('current_password')}</label> {/* THEMED */}
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          className="w-full p-2 rounded-lg border border-primary-bg bg-primary-bg text-text-primary" /* THEMED */
          disabled={isSubmitting}
        />
      </div>
      <div>
        <label className="block text-sm font-bold text-text-on-ui/90 mb-2">{t('new_password')}</label> {/* THEMED */}
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          className="w-full p-2 rounded-lg border border-primary-bg bg-primary-bg text-text-primary" /* THEMED */
          disabled={isSubmitting}
        />
      </div>
      <div>
        <label className="block text-sm font-bold text-text-on-ui/90 mb-2">{t('confirm_new_password')}</label> {/* THEMED */}
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="w-full p-2 rounded-lg border border-primary-bg bg-primary-bg text-text-primary" /* THEMED */
          disabled={isSubmitting}
        />
      </div>
      
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {success && <p className="text-green-400 text-sm">{success}</p>}
      
      <button 
        type="submit" 
        disabled={isSubmitting} 
        className="w-full px-4 py-2 rounded-lg font-semibold bg-accent text-text-on-ui hover:opacity-90 disabled:opacity-70 transition-colors" /* THEMED */
      >
        {isSubmitting ? t('saving') : t('save_changes')}
      </button>
    </form>
  );
}