// src/pages/CreditsPage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext.jsx';

export default function CreditsPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const credits = [
    { role: 'Programming', members: ['Woblu'] },
    { role: 'List Owner', members: ['Woblu'] },
    { role: 'List Admins', members: ['Woblu', 'GrownMagic', 'Time'] },
    { role: 'List Helpers', members: ['Woblu', 'GrownMagic', 'Time'] },
  ];

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 text-text-primary">
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-accent hover:text-accent/80 transition-colors"
        >
          <ChevronLeft size={20} />
          {t('back') || 'Back'}
        </button>
      </div>

      <div className="relative bg-ui-bg border-2 border-dotted border-accent backdrop-blur-sm p-8 rounded-xl shadow-2xl text-center">
        <h1 className="font-poppins text-5xl font-bold text-accent mb-8">Credits</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {credits.map((section, index) => (
            <div key={index} className="bg-primary-bg/50 rounded-lg p-6 border border-primary-bg">
              <h2 className="text-2xl font-bold text-text-on-ui mb-4">{section.role}</h2>
              <div className="flex flex-wrap justify-center gap-3">
                {section.members.map((member, idx) => (
                  <span key={idx} className="px-4 py-1 bg-ui-bg rounded-full text-text-muted border border-primary-bg shadow-sm font-semibold">
                    {member}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}