import React, { useState, useEffect } from "react";
import { NavLink, useLocation, Link } from "react-router-dom";
import SettingsMenu from "./SettingsMenu";
import StatsViewer from "./StatsViewer";
import InfoBox from "./InfoBox";
import { BarChart2, Info } from "lucide-react";
import logo from "../assets/dashrank-logo.webp";

const statsButtonTitles = {
  main: "Main Stats Viewer",
  unrated: "Unrated Stats Viewer",
  platformer: "Platformer Stats Viewer",
  challenge: "Challenge Stats Viewer",
  future: "Future Stats Viewer",
  speedhack: "Speedhack Stats Viewer"
};

export default function Tabs() {
  const tabs = [
    { name: "Main List", path: "/main", type: "main" },
    { name: "Unrated", path: "/unrated", type: "unrated" },
    { name: "Platformer", path: "/platformer", type: "platformer" },
    { name: "Challenge", path: "/challenge", type: "challenge" },
    { name: "Future", path: "/future", type: "future" },
    { name: "Speedhack", path: "/speedhack", type: "speedhack" }
  ];

  const [isStatsViewerOpen, setIsStatsViewerOpen] = useState(false);
  const [isInfoBoxOpen, setIsInfoBoxOpen] = useState(false);
  const location = useLocation();
  const [listType, setListType] = useState("main");

  useEffect(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    let currentListType = 'main';
    if (pathParts[0] === 'level') {
      currentListType = pathParts[1] || 'main';
    } else if (pathParts.length > 0) {
      currentListType = pathParts[0];
    }
    setListType(currentListType);
  }, [location.pathname]);

  return (
    <header className="relative bg-gray-100 dark:bg-gray-900 shadow-lg z-30">
      <div className="flex flex-col md:flex-row items-center justify-between px-4 py-3 gap-y-3">
        
        {/* Left Group (takes 1/3 of the space) */}
        <div className="w-full md:flex-1 flex justify-start">
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <img src={logo} alt="DashRank Logo" className="w-8 h-8" />
            <div>
              <span className="font-bold text-xl text-cyan-600 dark:text-cyan-400">DashRank</span>
              <span className="ml-2 text-xs font-mono text-gray-400 dark:text-gray-500">v1.0</span>
            </div>
          </Link>
        </div>

        {/* Center Group (takes 1/3 of the space) */}
        <div className="w-full md:flex-1 flex justify-center order-3 md:order-2">
            <div className="flex items-center gap-2 flex-wrap justify-center">
                {tabs.map((tab, i) => (
                <NavLink
                    key={i}
                    to={tab.path}
                    className={({ isActive }) =>
                    `px-3 py-2 rounded-md font-semibold transition-colors text-sm whitespace-nowrap ${
                        isActive
                        ? "bg-cyan-500 text-white"
                        : "text-cyan-600 dark:text-cyan-400 hover:bg-cyan-100 dark:hover:bg-cyan-700"
                    }`
                    }
                >
                    {tab.name}
                </NavLink>
                ))}
            </div>
        </div>

        {/* Right Group (takes 1/3 of the space) */}
        <div className="w-full md:flex-1 flex justify-end order-2 md:order-3">
            <div className="flex items-center gap-2">
                <button
                onClick={() => setIsInfoBoxOpen(true)}
                className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                aria-label="Information"
                >
                <Info className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                </button>
                <button
                onClick={() => setIsStatsViewerOpen(true)}
                className="p-2 rounded-lg font-semibold bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 transition-colors flex items-center space-x-2 text-sm"
                aria-label="View Top Players"
                >
                <BarChart2 className="w-4 h-4" />
                <span className="hidden sm:inline whitespace-nowrap">{statsButtonTitles[listType] || 'Stats Viewer'}</span>
                </button>
                <SettingsMenu />
            </div>
        </div>

      </div>

      <StatsViewer isOpen={isStatsViewerOpen} onClose={() => setIsStatsViewerOpen(false)} listType={listType} />
      <InfoBox isOpen={isInfoBoxOpen} onClose={() => setIsInfoBoxOpen(false)} />
    </header>
  );
}