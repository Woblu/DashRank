// src/components/Tabs.jsx
import React, { useState, useEffect } from "react";
import { NavLink, useLocation, Link } from "react-router-dom";
import { BarChart2, Info, LogIn, UserPlus, LogOut } from "lucide-react";
import logo from "../assets/dashrank-logo.webp";
import { useAuth } from "../contexts/AuthContext.jsx";
import StatsViewer from "./StatsViewer";
import InfoBox from "./InfoBox";
import SettingsMenu from "./SettingsMenu";

const statsButtonTitles = {
  main: "Main Stats Viewer", unrated: "Unrated Stats Viewer", platformer: "Platformer Stats Viewer",
  challenge: "Challenge Stats Viewer", speedhack: "Speedhack Stats Viewer", future: "Future Stats Viewer",
};

export default function Tabs() {
  const { user, logout } = useAuth();
  const tabs = [
    // The "Leaderboard" link has been removed from this array
    { name: "Main List", path: "/main" }, 
    { name: "Unrated", path: "/unrated" },
    { name: "Platformer", path: "/platformer" }, 
    { name: "Challenge", path: "/challenge" },
    { name: "Speedhack", path: "/speedhack" }, 
    { name: "Future", path: "/future" },
  ];

  const [isStatsViewerOpen, setIsStatsViewerOpen] useState(false);
  const [isInfoBoxOpen, setIsInfoBoxOpen] = useState(false);
  const [listType, setListType] = useState("main");
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname.split("/")[1] || "main";
    setListType(path);
  }, [location.pathname]);

  const AuthButtons = () => {
    if (user) {
      return (
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-300">
            Welcome, <span className="font-bold text-cyan-400">{user.username}</span>
          </span>
          <button onClick={logout} className="flex items-center gap-2 px-3 py-2 rounded-md font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors text-sm">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <Link to="/login" className="flex items-center gap-2 px-3 py-2 rounded-md font-semibold bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors text-sm">
          <LogIn className="w-4 h-4" /> Login
        </Link>
        <Link to="/register" className="flex items-center gap-2 px-3 py-2 rounded-md font-semibold bg-cyan-600 hover:bg-cyan-700 text-white transition-colors text-sm">
          <UserPlus className="w-4 h-4" /> Register
        </Link>
      </div>
    );
  };

  return (
    <>
      <header className="relative bg-gray-900 shadow-lg z-30 border-b border-gray-700">
        <div className="flex flex-col md:flex-row items-center justify-between px-4 py-3 gap-y-3">
          <div className="w-full md:flex-1 flex justify-start">
            <Link to="/" className="flex items-center gap-2 flex-shrink-0">
              <img src={logo} alt="DashRank Logo" className="w-8 h-8" />
              <div>
                <span className="font-bold text-xl text-cyan-400">DashRank</span>
                <span className="ml-2 text-xs font-mono text-gray-500">v1.0</span>
              </div>
            </Link>
          </div>
          <nav className="w-full md:flex-1 flex justify-center order-3 md:order-2">
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {tabs.map((tab) => (
                <NavLink key={tab.name} to={tab.path} className={({ isActive }) => `px-3 py-2 rounded-md font-semibold transition-colors text-sm whitespace-nowrap ${isActive ? "bg-cyan-500 text-white" : "text-cyan-400 hover:bg-cyan-700/50"}`}>
                  {tab.name}
                </NavLink>
              ))}
            </div>
          </nav>
          <div className="w-full md:flex-1 flex justify-end items-center gap-2 order-2 md:order-3">
            <button title={statsButtonTitles[listType]} onClick={() => setIsStatsViewerOpen(true)} className="flex items-center gap-2 px-3 py-2 rounded-md font-semibold bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors text-sm">
              <BarChart2 className="w-4 h-4" />
              <span className="hidden md:inline">{statsButtonTitles[listType]}</span>
            </button>
            <button title="Info" onClick={() => setIsInfoBoxOpen(true)} className="p-2 rounded-md font-semibold bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors">
              <Info className="w-5 h-5" />
            </button>
            <SettingsMenu />
            <AuthButtons />
          </div>
        </div>
      </header>
      {isStatsViewerOpen && <StatsViewer listType={listType} onClose={() => setIsStatsViewerOpen(false)} title={statsButtonTitles[listType]}/>}
      {isInfoBoxOpen && <InfoBox onClose={() => setIsInfoBoxOpen(false)} />}
    </>
  );
}