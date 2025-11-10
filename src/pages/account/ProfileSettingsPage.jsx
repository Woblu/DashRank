// src/pages/account/ProfileSettingsPage.jsx
import React from 'react';
import ChangeUsernameForm from '../../components/forms/ChangeUsernameForm';
import ChangePasswordForm from '../../components/forms/ChangePasswordForm';
import { useLanguage } from '../../contexts/LanguageContext'; // 1. Import

export default function ProfileSettingsPage() {
  const { t } = useLanguage(); // 2. Initialize

  return (
    <div className="space-y-8">
      <div className="bg-ui-bg border border-primary-bg rounded-lg"> {/* THEMED */}
        <header className="p-4 border-b border-primary-bg"> {/* THEMED */}
          <h2 className="text-2xl font-bold text-text-on-ui">{t('change_username')}</h2> {/* THEMED & Translated */}
        </header>
        <div className="p-6"><ChangeUsernameForm /></div>
      </div>
      <div className="bg-ui-bg border border-primary-bg rounded-lg"> {/* THEMED */}
        <header className="p-4 border-b border-primary-bg"> {/* THEMED */}
          <h2 className="text-2xl font-bold text-text-on-ui">{t('change_password')}</h2> {/* THEMED & Translated */}
        </header>
        <div className="p-6"><ChangePasswordForm /></div>
      </div>
    </div>
  );
}