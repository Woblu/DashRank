// src/components/Tabs.jsx
import React, { useState, useEffect } from "react";
import { NavLink, useLocation, Link } from "react-router-dom";
import { BarChart2, Info, LogIn, UserPlus, LogOut } from "lucide-react";
import logo from "../assets/dashrank-logo.webp";
import { useAuth } from "../contexts/AuthContext.jsx"; // Ensure this path is correct
import StatsViewer from "./StatsViewer"; // Restoring this
import InfoBox from "./InfoBox";       // Restoring this

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

  const AuthButtons = () => { /* This component remains the same */ };

  return (
    <>
      <header className="relative bg-gray-900 shadow-lg z-30 border-b border-gray-700">
        <div className="flex flex-col md:flex-row items-center justify-between px-4 py-3 gap-y-3">
          {/* Left and Center Groups remain the same */}
          
          <div className="w-full md:flex-1 flex justify-end items-center gap-2 order-2 md:order-3">
            {/* Restored Buttons */}
            <button
              title={statsButtonTitles[listType]}
              onClick={() => setIsStatsViewerOpen(true)}
              className="p-2 rounded-md font-semibold bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors"
            >
              <BarChart2 className="w-5 h-5" />
            </button>
            <button
              title="Info"
              onClick={() => setIsInfoBoxOpen(true)}
              className="p-2 rounded-md font-semibold bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors"
            >
              <Info className="w-5 h-5" />
            </button>

            {/* Auth Buttons */}
            <AuthButtons />
          </div>
        </div>
      </header>
      
      {/* Restored Modals */}
      {isStatsViewerOpen && (
        <StatsViewer listType={listType} onClose={() => setIsStatsViewerOpen(false)} />
      )}
      {isInfoBoxOpen && <InfoBox onClose={() => setIsInfoBoxOpen(false)} />}
    </>
  );
}