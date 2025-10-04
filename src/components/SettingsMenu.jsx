// src/components/SettingsMenu.jsx
import React, { useState, useEffect, useRef } from "react";
import { Sun, Moon, Settings, User, Shield, BookText } from "lucide-react"; // Import BookText
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { Link } from "react-router-dom";

export default function SettingsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("darkMode") === "true");
  const { language, setLanguage, t } = useLanguage();
  const { user } = useAuth();
  const menuRef = useRef(null);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("darkMode", darkMode);
  }, [darkMode]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuRef]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        title="Settings"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-md font-semibold bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
      >
        <Settings className="w-5 h-5 text-gray-800 dark:text-gray-200" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4 z-50">
          
          {user && (user.role === 'ADMIN' || user.role === 'MODERATOR') && (
            <>
              <Link
                to="/admin"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 text-gray-900 dark:text-gray-100 font-semibold hover:text-cyan-500 transition-colors"
              >
                <Shield className="w-5 h-5" />
                <span>Admin Panel</span>
              </Link>
              <hr className="border-gray-300 dark:border-gray-600 my-2" />
            </>
          )}

          {user && (
            <>
              <Link
                to="/account"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 text-gray-900 dark:text-gray-100 font-semibold hover:text-cyan-500 transition-colors"
              >
                <User className="w-5 h-5" />
                <span>My Account</span>
              </Link>
              <hr className="border-gray-300 dark:border-gray-600 my-2" />
            </>
          )}

          {/* New Guidelines Link */}
          <Link
            to="/guidelines"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 text-gray-900 dark:text-gray-100 font-semibold hover:text-cyan-500 transition-colors"
          >
            <BookText className="w-5 h-5" />
            <span>Guidelines</span>
          </Link>

          <hr className="border-gray-300 dark:border-gray-600 my-2" />

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
      )}
    </div>
  );
}