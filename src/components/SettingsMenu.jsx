// src/components/SettingsMenu.jsx
import React, { useState, useEffect } from "react";
import { Sun, Moon, Settings, X } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext.jsx";

export default function SettingsMenu({ onClose }) { // Now accepts onClose prop
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    // Ensure we handle non-boolean values from localStorage
    return saved === "true";
  });
  
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("darkMode", darkMode);
  }, [darkMode]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
        <header className="relative p-4 border-b border-gray-200 dark:border-gray-700 flex justify-end items-center">
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
            <Settings className="w-6 h-6 text-cyan-500" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
            <X className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </button>
        </header>

        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-900 dark:text-gray-100 font-semibold">Theme</span>
            <div className="flex items-center justify-center gap-3">
              <Sun className="w-5 h-5 text-yellow-500" />
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={darkMode} onChange={() => setDarkMode(!darkMode)} />
                <div className="w-12 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-cyan-400 peer-checked:bg-cyan-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border after:border-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:bg-gray-800 dark:after:border-gray-600 peer-checked:after:translate-x-6"></div>
              </label>
              <Moon className="w-5 h-5 text-blue-300" />
            </div>
          </div>
          
          <div className="flex items-center justify-between gap-2">
            <span className="text-gray-900 dark:text-gray-100 font-semibold">{t('language')}</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md p-1 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-cyan-400"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="ko">한국어</option>
              <option value="ru">Русский</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}