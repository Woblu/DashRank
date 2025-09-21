// src/components/Tabs.jsx
import React, { useState, useEffect } from "react";
import { NavLink, useLocation, Link, useNavigate } from "react-router-dom";
import { BarChart2, Info, LogIn, UserPlus, LogOut, Search } from "lucide-react";
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
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  
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

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/search?q=${searchTerm.trim()}`);
      setSearchTerm(''); // Optional: clear search bar after submit
    }
  };

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
          
          <div className="w-full md:flex-1 flex flex-col items-center gap-3 order-3 md:order-2">
            <form onSubmit={handleSearchSubmit} className="relative w-full max-w-sm">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search for a level or creator..."
                className="w-full p-2 pl-10 rounded-lg border border-gray-600 bg-gray-800 text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </form>
            <nav className="flex items-center gap-2 flex-wrap justify-center">
              {tabs.map((tab) => (
                <NavLink key={tab.name} to={tab.path} className={({ isActive }) => `px-3 py-2 rounded-md font-semibold transition-colors text-sm whitespace-nowrap ${isActive ? "bg-cyan-500 text-white" : "text-cyan-400 hover:bg-cyan-700/50"}`}>
                  {tab.name}
                </NavLink>
              ))}
            </nav>
          </div>

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