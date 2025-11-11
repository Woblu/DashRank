// src/components/SettingsMenu.jsx
import React, { useState, useEffect, useRef } from "react";
import { Settings, User, Shield, BookText, Palette } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { Link } from "react-router-dom";

export default function SettingsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  
  // Set the default theme to "cyan", which is now your original dark mode
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "cyan");

  const { language, setLanguage, t } = useLanguage();
  const { user } = useAuth();
  const menuRef = useRef(null);

  // This single effect controls the theme
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Effect for closing menu on outside click
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
        className="p-2 rounded-md font-semibold bg-button-bg text-text-primary hover:bg-accent/10 transition-colors" /* THEMED-FIX */
      >
        <Settings className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-ui-bg rounded-lg shadow-xl border border-primary-bg p-4 space-y-4 z-50">
          
          {user && (user.role === 'ADMIN' || user.role === 'MODERATOR') && (
            <>
              <Link
                to="/admin"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 text-text-on-ui font-semibold hover:text-accent transition-colors"
              >
                <Shield className="w-5 h-5" />
                <span>{t('admin_panel')}</span>
              </Link>
              <hr className="border-primary-bg my-2" />
            </>
          )}

          {user && (
            <>
              <Link
                to="/account"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 text-text-on-ui font-semibold hover:text-accent transition-colors"
              >
                <User className="w-5 h-5" />
                <span>{t('my_account')}</span>
              </Link>
              <hr className="border-primary-bg my-2" />
            </>
          )}

          <Link
            to="/guidelines"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 text-text-on-ui font-semibold hover:text-accent transition-colors"
          >
            <BookText className="w-5 h-5" />
            <span>{t('guidelines')}</span>
          </Link>

          <hr className="border-primary-bg my-2" />

          {/* Theme Selector Dropdown */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-text-on-ui font-semibold flex items-center gap-2">
              <Palette className="w-5 h-5" /> {t('theme')}
            </span>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="bg-primary-bg text-text-primary rounded-md p-1 border border-ui-bg focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="cyan">Default (Dark)</option>
              <option value="cyan-light">Default (Light)</option>
              <option value="red">Red (Dark)</option>
              <option value="green">Green (Dark)</option>
              <option value="mono">Mono (Light)</option>
            </select>
          </div>
          
          {/* Language Selector */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-text-on-ui font-semibold">{t('language')}</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-primary-bg text-text-primary rounded-md p-1 border border-ui-bg focus:outline-none focus:ring-1 focus:ring-accent"
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