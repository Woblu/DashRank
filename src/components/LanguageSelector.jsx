// src/components/LanguageSelector.jsx
import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const LanguageSelector = () => {
  const { language, setLanguage, t } = useLanguage();

  const handleChange = (e) => {
    setLanguage(e.target.value);
  };

  return (
    <div className="flex items-center space-x-2">
      <label htmlFor="language-select" className="text-sm font-medium">
        {t('language')}:
      </label>
      <select
        id="language-select"
        value={language}
        onChange={handleChange}
        className="rounded border border-gray-600 bg-gray-700 p-1 text-white focus:outline-none"
      >
        <option value="en">English</option>
        <option value="es">Español</option>
        <option value="ru">Русский</option>
        <option value="ko">한국어</option>
      </select>
    </div>
  );
};

export default LanguageSelector;