import React, { useState, useEffect, useRef } from "react";
import { NavLink, useLocation, Link } from "react-router-dom";
import { BarChart2, Info, LogIn, UserPlus, BookMarked, Hammer, Menu, X } from "lucide-react";
import logo from "../assets/dashrank-logo.webp";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useLanguage } from "../contexts/LanguageContext.jsx"; // 1. Import
import StatsViewer from "./StatsViewer";
import InfoBox from "./InfoBox";
import SettingsMenu from "./SettingsMenu";

export default function Tabs() {
  const { user } = useAuth();
  const { t } = useLanguage(); // 2. Initialize
  const location = useLocation();
  const mobileMenuRef = useRef(null);
  
  // 3. Translated Stats Button Titles
  const statsButtonTitles = {
    main: t('main_stats_viewer'),
    unrated: t('unrated_stats_viewer'),
    platformer: t('platformer_stats_viewer'),
    challenge: t('challenge_stats_viewer'),
    speedhack: t('speedhack_stats_viewer'), // You will need to add this key
    future: t('future_stats_viewer'),
  };
  
  // 4. Translated Tabs
  const tabs = [
    { name: t('main_list'), path: "/main" }, 
    { name: t('unrated_list'), path: "/unrated" },
    { name: t('platformer_list'), path: "/platformer" }, 
    { name: t('challenge_list'), path: "/challenge" },
    { name: t('speedhack_list'), path: "/speedhack" }, // You will need to add this key
    { name: t('future_list'), path: "/future" },
    { name: t('creators_workshop'), path: "/layouts", icon: Hammer }, // You will need to add this key
  ];

  const [isStatsViewerOpen, setIsStatsViewerOpen] = useState(false);
  const [isInfoBoxOpen, setIsInfoBoxOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [listType, setListType] = useState(() => {
    return localStorage.getItem('lastViewedList') || 'main';
  });

  useEffect(() => {
    const currentPathSegment = location.pathname.split("/")[1] || "main";
    if (Object.keys(statsButtonTitles).includes(currentPathSegment)) {
      setListType(currentPathSegment);
      localStorage.setItem('lastViewedList', currentPathSegment);
    }
    // Update statsButtonTitles if language changes
  }, [location.pathname, t]); // Add t as a dependency

  // Close mobile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    }
    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  const AuthButtons = () => {
    if (user) {
      return null;
    }
    return (
      <div className="flex items-center gap-2">
        <Link 
          to="/login" 
          className="flex items-center gap-2 px-3 py-2 rounded-md font-semibold bg-primary-bg text-text-primary hover:bg-accent/10 transition-colors text-sm"
        >
          <LogIn className="w-4 h-4" /> {t('login')} {/* 5. Translated */}
        </Link>
        <Link 
          to="/register" 
          className="flex items-center gap-2 px-3 py-2 rounded-md font-semibold bg-accent text-text-on-ui hover:opacity-90 transition-colors text-sm"
        >
          <UserPlus className="w-4 h-4" /> {t('register')} {/* 6. Translated */}
        </Link>
      </div>
    );
  };

  return (
    <>
      <header className="relative bg-ui-bg shadow-lg z-30 border-b border-primary-bg"> {/* THEMED */}
        <div className="flex flex-col md:flex-row items-center justify-between px-4 py-3 gap-y-3">
          <div className="w-full md:flex-1 flex justify-start">
            <Link to="/" className="flex items-center gap-2 flex-shrink-0">
              <img src={logo} alt="DashRank Logo" className="w-8 h-8" />
              <div>
                <span className="font-bold text-xl text-accent">DashRank</span> {/* THEMED */}
                <span className="ml-2 text-xs font-mono text-text-muted">v1.0</span> {/* THEMED */}
              </div>
            </Link>
          </div>
          {/* Mobile Menu Button */}
          <div className="md:hidden order-2">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md bg-primary-bg text-text-primary hover:bg-accent/10 transition-colors" /* THEMED */
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex md:flex-1 md:justify-center order-3 md:order-2">
            <div className="flex items-center gap-2 justify-center">
              
              <NavLink
                to={user ? "/progression" : "/login"}
                state={!user ? { from: { pathname: "/progression" } } : undefined}
                className={({ isActive }) => `px-3 py-2 rounded-md font-semibold transition-colors text-sm whitespace-nowrap flex items-center gap-2 ${isActive ? "bg-accent text-text-on-ui" : "text-accent hover:bg-accent/20"}`} /* THEMED */
              >
                <BookMarked className="w-4 h-4" />
                {t('progression_tracker')} {/* 7. Translated */}
              </NavLink>

              {tabs.map((tab) => (
                <NavLink 
                  key={tab.name} 
                  to={tab.path} 
                  className={({ isActive }) => `px-3 py-2 rounded-md font-semibold transition-colors text-sm whitespace-nowrap flex items-center gap-2 ${isActive ? "bg-accent text-text-on-ui" : "text-accent hover:bg-accent/20"}`} /* THEMED */
                >
                  {tab.icon && <tab.icon className="w-4 h-4" />}
                  {tab.name}
                </NavLink>
              ))}
            </div>
          </nav>
          <div className="w-full md:flex-1 flex justify-end items-center gap-2 order-2 md:order-3">
            <button 
              title={statsButtonTitles[listType]} 
              onClick={() => setIsStatsViewerOpen(true)} 
              className="flex items-center gap-2 px-3 py-2 rounded-md font-semibold bg-primary-bg text-text-primary hover:bg-accent/10 transition-colors text-sm" /* THEMED */
            >
              <BarChart2 className="w-4 h-4" />
              <span className="hidden md:inline">{statsButtonTitles[listType]}</span>
            </button>
            <button 
              title={t('info_title')} /* Translated */
              onClick={() => setIsInfoBoxOpen(true)} 
              className="p-2 rounded-md font-semibold bg-primary-bg text-text-primary hover:bg-accent/10 transition-colors" /* THEMED */
            >
              <Info className="w-5 h-5" />
            </button>
            {user ? <SettingsMenu /> : <AuthButtons />}
          </div>
        </div>
      </header>

      {/* Mobile Dropdown Menu */}
      {isMobileMenuOpen && (
        <div ref={mobileMenuRef} className="md:hidden bg-ui-bg border-b border-primary-bg shadow-lg"> {/* THEMED */}
          <div className="px-4 py-3 space-y-2">
            <NavLink
              to={user ? "/progression" : "/login"}
              state={!user ? { from: { pathname: "/progression" } } : undefined}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => `block px-3 py-2 rounded-md font-semibold transition-colors text-sm flex items-center gap-2 ${isActive ? "bg-accent text-text-on-ui" : "text-accent hover:bg-accent/20"}`} /* THEMED */
            >
              <BookMarked className="w-4 h-4" />
              {t('progression_tracker')} {/* Translated */}
            </NavLink>

            {tabs.map((tab) => (
              <NavLink 
                key={tab.name} 
                to={tab.path} 
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => `block px-3 py-2 rounded-md font-semibold transition-colors text-sm flex items-center gap-2 ${isActive ? "bg-accent text-text-on-ui" : "text-accent hover:bg-accent/20"}`} /* THEMED */
              >
                {tab.icon && <tab.icon className="w-4 h-4" />}
                {tab.name}
              </NavLink>
            ))}
          </div>
        </div>
      )}

      {isStatsViewerOpen && <StatsViewer listType={listType} onClose={() => setIsStatsViewerOpen(false)} title={statsButtonTitles[listType]}/>}
      {isInfoBoxOpen && <InfoBox onClose={() => setIsInfoBoxOpen(false)} />}
    </>
  );
}