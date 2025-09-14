import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';

import enTranslations from '../translations/en.json';
import ruTranslations from '../translations/ru.json';
import esTranslations from '../translations/es.json';
import koTranslations from '../translations/ko.json';

const translations = {
  en: enTranslations,
  ru: ruTranslations,
  es: esTranslations,
  ko: koTranslations,
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(
    localStorage.getItem('language') || 'en'
  );

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = useCallback((key) => {
    return translations[language][key] || key;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);