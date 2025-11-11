// src/pages/account/SubmissionPage.jsx
import React from 'react';
import SubmissionForm from '../../components/SubmissionForm';
import { useLanguage } from '../../contexts/LanguageContext'; // 1. Import

export default function SubmissionPage() {
  const { t } = useLanguage(); // 2. Initialize

  return (
    <div className="bg-ui-bg border border-primary-bg rounded-lg"> {/* THEMED */}
      <header className="p-4 border-b border-primary-bg"> {/* THEMED */}
        <h2 className="text-2xl font-bold text-text-on-ui">{t('submit_new_record')}</h2> {/* THEMED & Translated */}
      </header>
      <div className="p-6"><SubmissionForm /></div>
    </div>
  );
}