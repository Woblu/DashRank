import React from "react";
import { NavLink } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext"; // Import useLanguage

export default function NavBar() {
  const { t } = useLanguage(); // Initialize hook

  // Use translation keys for tab names
  const tabs = [
    { name: t('main_list'), path: "/main" },
    { name: t('unrated_list'), path: "/unrated" },
    { name: t('platformer_list'), path: "/platformer" },
    { name: t('future_list'), path: "/future" },
    { name: t('challenge_list'), path: "/challenges" },
    { name: "Players", path: "/players" }, // 'Players' doesn't seem to have a key yet, so we'll leave it
  ];

  return (
    <div className="bg-ui-bg shadow-md mb-6"> {/* Updated */}
      <div className="max-w-4xl mx-auto flex justify-center gap-2 p-2 overflow-x-auto sm:gap-4 sm:p-4">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path} // Use path for key as name is translated and can change
            to={tab.path}
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg font-semibold whitespace-nowrap text-sm sm:text-base ${
                isActive
                  ? "bg-accent text-text-on-ui" // Updated
                  : "text-accent hover:bg-accent/20" // Updated
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