// src/pages/AccountPage.jsx
import React from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import SubmissionForm from '../components/SubmissionForm'; // We'll place the form here

export default function AccountPage() {
  const { user } = useAuth();

  return (
    <div className="text-white max-w-4xl mx-auto py-8">
      <h1 className="text-4xl font-bold mb-4">
        Welcome, <span className="text-cyan-400">{user.username}</span>
      </h1>
      <p className="text-lg text-gray-400 mb-8">
        Manage your account settings and submissions.
      </p>

      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Submit a Record</h2>
        <SubmissionForm />
      </div>

      {/* In the future, you can add more sections here */}
      {/* <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mt-8">...</div> */}
    </div>
  );
}