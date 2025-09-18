// src/pages/account/ProfileSettingsPage.jsx
import React from 'react';
import ChangeUsernameForm from '../../components/forms/ChangeUsernameForm';
import ChangePasswordForm from '../../components/forms/ChangePasswordForm';

export default function ProfileSettingsPage() {
  return (
    <div className="space-y-8">
      <div className="bg-gray-800 border border-gray-700 rounded-lg">
        <header className="p-4 border-b border-gray-700"><h2 className="text-2xl font-bold">Change Username</h2></header>
        <div className="p-6"><ChangeUsernameForm /></div>
      </div>
      <div className="bg-gray-800 border border-gray-700 rounded-lg">
        <header className="p-4 border-b border-gray-700"><h2 className="text-2xl font-bold">Change Password</h2></header>
        <div className="p-6"><ChangePasswordForm /></div>
      </div>
    </div>
  );
}