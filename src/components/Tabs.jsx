// src/components/Tabs.jsx
import React, { useState, useEffect } from "react";
import { NavLink, useLocation, Link } from "react-router-dom";
import { BarChart2, Info, LogIn, UserPlus, LogOut } from "lucide-react";
import logo from "../assets/dashrank-logo.webp";
import { useAuth } from "../contexts/AuthContext.jsx";
import StatsViewer from "./StatsViewer";
import InfoBox from "./InfoBox";
import SettingsMenu from "./SettingsMenu";

// UPDATED TEXT IS HERE
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
  const [listType, setListType] = useState("main");
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname.split("/")[1] || "main";
    setListType(path);
  }, [location.pathname]);

  const AuthButtons = () => { /* ... */ };

  return (
    <>
      <header className="relative bg-gray-900 shadow-lg z-30 border-b border-gray-700">
        <div className="flex flex-col md:flex-row items-center justify-between px-4 py-3 gap-y-3">
          {/* ... Left and Center Groups ... */}

          <div className="w-full md:flex-1 flex justify-end items-center gap-2 order-2 md:order-3">
            <button
              title={statsButtonTitles[listType]}
              onClick={() => setIsStatsViewerOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-md font-semibold bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors text-sm"
            >
              <BarChart2 className="w-4 h-4" />
              <span className="hidden md:inline">{statsButtonTitles[listType]}</span>
            </button>
            <button title="Info" onClick={() => setIsInfoBoxOpen(true)} className="p-2 ...">
              <Info className="w-5 h-5" />
            </button>
            <SettingsMenu />
            <AuthButtons />
          </div>
        </div>
      </header>

      {isStatsViewerOpen && (
        <StatsViewer 
          listType={listType} 
          onClose={() => setIsStatsViewerOpen(false)}
          title={statsButtonTitles[listType]} // No longer need to add "Viewer" here
        />
      )}
      {isInfoBoxOpen && <InfoBox onClose={() => setIsInfoBoxOpen(false)} />}
    </>
  );
}