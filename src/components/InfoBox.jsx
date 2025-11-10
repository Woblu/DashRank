// src/components/InfoBox.jsx
import React from 'react';
import { X, Info } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext'; // <-- 1. Import hook

export default function InfoBox({ onClose }) {
  const { t } = useLanguage(); // <-- 2. Initialize hook

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="relative p-4 border-b border-gray-200 dark:border-gray-700 flex justify-end items-center">
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
            <Info className="w-6 h-6 text-cyan-500" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('info_title')}</h2> {/* <-- 3. Use t() */}
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
            <X className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </button>
        </header>
        
        <div className="p-6 overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 120px)' }}>
          <div className="text-gray-700 dark:text-gray-300">
            {/* All text below is now translated */}
            <h3 className="font-bold text-xl text-gray-800 dark:text-gray-100 mb-2">{t('info_about_title')}</h3>
            <p className="text-sm mb-4">
              <span className="text-cyan-600 dark:text-cyan-400 font-semibold">DashRank</span> {t('info_about_desc')}
            </p>

            <h3 className="font-bold text-xl text-gray-800 dark:text-gray-100 mb-2">{t('info_future_title')}</h3>
            <ul className="list-disc list-inside text-sm mb-4 space-y-1">
              <li>{t('info_future_1')}</li>
              <li>{t('info_future_2')}</li>
              <li>{t('info_future_3')}</li>
            </ul>

            <h3 className="font-bold text-xl text-gray-800 dark:text-gray-100 mb-2">{t('info_history_title')}</h3>
            <p className="text-sm mb-4">
              {t('info_history_desc')}
            </p> {/* <-- THIS IS THE FIX (was </f>) */}

            <h3 className="font-bold text-xl text-gray-800 dark:text-gray-100 mb-2">{t('info_api_title')}</h3>
            <p className="text-sm mb-4">
              {t('info_api_desc')}
            </p>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-800 dark:text-gray-100">{t('info_api_list_title')}</h4>
                <code className="block bg-gray-200 dark:bg-gray-900 rounded p-2 mt-1 font-mono text-sm text-gray-800 dark:text-gray-200">
                  GET /api/lists/:listType
                </code>
                <div className="mt-2 text-xs">
                  <p><strong>{t('info_api_list_example')}</strong> <code className="bg-gray-200 dark:bg-gray-700 rounded px-1 font-mono">/api/lists/main</code></p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-800 dark:text-gray-100">{t('info_api_level_title')}</h4>
                <code className="block bg-gray-200 dark:bg-gray-900 rounded p-2 mt-1 font-mono text-sm text-gray-800 dark:text-gray-200">
                  GET /api/level/:levelId
                </code>
               <div className="mt-2 text-xs">
                <p><strong>{t('info_api_level_example')}</strong> <code className="bg-gray-200 dark:bg-gray-700 rounded px-1 font-mono">/api/level/8424015</code></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}