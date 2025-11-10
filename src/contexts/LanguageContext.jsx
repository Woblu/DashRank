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

  const t = useCallback((key, variables = {}) => {
    // 1. Find the translation in the current language
    let translation = translations[language][key];

    // 2. If not found, fall back to English
    if (!translation) {
      translation = translations['en'][key] || key;
    }

    // 3. Replace variables like {name}
    return translation.replace(/{(\w+)}/g, (match, varName) => {
      return variables[varName] !== undefined ? variables[varName] : match;
    });
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);