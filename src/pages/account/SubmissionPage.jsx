// src/pages/account/SubmissionPage.jsx
import React from 'react';
import SubmissionForm from '../../components/SubmissionForm';

export default function SubmissionPage() {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg">
      <header className="p-4 border-b border-gray-700"><h2 className="text-2xl font-bold">Submit a New Record</h2></header>
      <div className="p-6"><SubmissionForm /></div>
    </div>
  );
}