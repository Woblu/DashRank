// src/components/Tabs.jsx
import React, { useState, useEffect } from "react";
import { NavLink, useLocation, Link } from "react-router-dom";
import { BarChart2, Info, Settings, LogIn, UserPlus, LogOut } from "lucide-react"; // Added Settings icon
import logo from "../assets/dashrank-logo.webp";
import { useAuth } from "../contexts/AuthContext.jsx";
import StatsViewer from "./StatsViewer";
import InfoBox from "./InfoBox";
import SettingsMenu from "./SettingsMenu"; // Added SettingsMenu import

const statsButtonTitles = {
  main: "Main Stats Viewer",
  unrated: "Unrated Stats Viewer",
  platformer: "Platformer Stats Viewer",
  challenge: "Challenge Stats Viewer",
  speedhack: "Speedhack Stats Viewer",
  future: "Future Stats Viewer",
};

export default function Tabs() {
  const { user, logout } = useAuth();
  const tabs = [
    { name: "Main List", path: "/main" }, { name: "Unrated", path: "/unrated" },
    { name: "Platformer", path: "/platformer" }, { name: "Challenge", path: "/challenge" },
    { name: "Speedhack", path: "/speedhack" }, { name: "Future", path: "/future" },
  ];

  const [isStatsViewerOpen, setIsStatsViewerOpen] = useState(false);
  const [isInfoBoxOpen, setIsInfoBoxOpen] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false); // Added state for Settings
  const [listType, setListType] = useState("main");
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname.split("/")[1] || "main";
    setListType(path);
  }, [location.pathname]);

  const AuthButtons = () => { /* ... functional component from before ... */ };
  
  // DEBUGGING: Wrapped state setters in functions that log to the console
  const handleStatsClick = () => {
    console.log("Stats Viewer button clicked!");
    setIsStatsViewerOpen(true);
  };
  const handleInfoClick = () => {
    console.log("Info Box button clicked!");
    setIsInfoBoxOpen(true);
  };
  const handleSettingsClick = () => {
    console.log("Settings Menu button clicked!");
    setIsSettingsMenuOpen(true);
  };

  return (
    <>
      <header className="relative bg-gray-900 shadow-lg z-30 border-b border-gray-700">
        <div className="flex flex-col md:flex-row items-center justify-between px-4 py-3 gap-y-3">
          {/* Left Group */}
          <div className="w-full md:flex-1 flex justify-start">{/* ... Logo and Title ... */}</div>
          {/* Center Group */}
          <nav className="w-full md:flex-1 flex justify-center order-3 md:order-2">{/* ... NavLinks ... */}</nav>
          {/* Right Group */}
          <div className="w-full md:flex-1 flex justify-end items-center gap-2 order-2 md:order-3">
            <button title={statsButtonTitles[listType]} onClick={handleStatsClick} className="p-2 rounded-md font-semibold bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors">
              <BarChart2 className="w-5 h-5" />
            </button>
            <button title="Info" onClick={handleInfoClick} className="p-2 rounded-md font-semibold bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors">
              <Info className="w-5 h-5" />
            </button>
            <button title="Settings" onClick={handleSettingsClick} className="p-2 rounded-md font-semibold bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            <AuthButtons />
          </div>
        </div>
      </header>
      
      {/* Modals */}
      {isStatsViewerOpen && <StatsViewer listType={listType} onClose={() => setIsStatsViewerOpen(false)} />}
      {isInfoBoxOpen && <InfoBox onClose={() => setIsInfoBoxOpen(false)} />}
      {isSettingsMenuOpen && <SettingsMenu onClose={() => setIsSettingsMenuOpen(false)} />}
    </>
  );
}