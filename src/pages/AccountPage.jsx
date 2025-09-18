// src/pages/AccountPage.jsx
import React from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import SubmissionForm from '../components/SubmissionForm';
import ChangeUsernameForm from '../components/forms/ChangeUsernameForm'; // Import new form
import ChangePasswordForm from '../components/forms/ChangePasswordForm'; // Import new form

export default function AccountPage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="text-white max-w-4xl mx-auto py-8 px-4 space-y-8">
      <h1 className="text-4xl font-bold">
        Welcome, <span className="text-cyan-400">{user.username}</span>
      </h1>
      
      {/* Container for all account sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Column: Submissions */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg">
          <header className="p-4 border-b border-gray-700"><h2 className="text-2xl font-bold">Submit a Record</h2></header>
          <div className="p-6"><SubmissionForm /></div>
        </div>

        {/* Right Column: Settings */}
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

      </div>
    </div>
  );
}