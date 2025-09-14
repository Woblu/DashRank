import React from "react";
import { NavLink } from "react-router-dom";

export default function NavBar() {
  const tabs = [
    { name: "Main", path: "/main" },
    { name: "Unrated", path: "/unrated" },
    { name: "Platformer", path: "/platformer" },
    { name: "Future", path: "/future" },
    { name: "Challenges", path: "/challenges" },
    { name: "Players", path: "/players" }, // Corrects the path
  ];

  return (
    <div className="bg-white shadow-md mb-6">
      <div className="max-w-4xl mx-auto flex justify-center gap-2 p-2 overflow-x-auto sm:gap-4 sm:p-4">
        {tabs.map((tab) => (
          <NavLink
            key={tab.name}
            to={tab.path}
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg font-semibold whitespace-nowrap text-sm sm:text-base ${
                isActive
                  ? "bg-cyan-600 text-white"
                  : "text-cyan-600 hover:bg-cyan-100"
              }`
            }
          >
            {tab.name}
          </NavLink>
        ))}
      </div>
    </div>
  );
}