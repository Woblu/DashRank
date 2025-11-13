import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { BarChart3, List, Users, Hammer, BookMarked } from 'lucide-react';
import logo from '../assets/dashrank-logo.webp'; // Import your logo

export default function LandingPage() {
  const { t } = useLanguage();

  const sections = [
    { name: t('main_list'), path: '/main', icon: List, desc: 'The official ranked list of top demons.' },
    { name: t('creators_workshop'), path: '/layouts', icon: Hammer, desc: 'Collaborate, find decorators, and share layouts.' },
    { name: t('progression_tracker'), path: '/progression', icon: BookMarked, desc: 'Log your demon completions and track your progress.' },
    { name: t('top_players'), path: '/players', icon: Users, desc: 'See who is at the top of the leaderboard.' }
  ];

  return (
    // We use primary-bg here, as this page is outside the main "App" layout
    <div className="min-h-screen bg-primary-bg text-text-primary p-8 flex flex-col items-center justify-center">
      <div className="text-center max-w-3xl mx-auto">
        <img src={logo} alt="DashRank Logo" className="w-24 h-24 mx-auto mb-6" />
        <h1 className="font-poppins text-6xl font-bold text-accent mb-4">
          DashRank
        </h1>
        <p className="text-2xl text-text-muted mb-12">
          {t('landing_page_subtitle', {
            defaultValue: 'The all-in-one Geometry Dash list and creator hub.'
          })}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sections.map((section) => (
            <Link
              key={section.path}
              to={section.path}
              className="block p-6 bg-ui-bg border border-primary-bg rounded-xl shadow-lg hover:border-accent transition-all duration-200 group"
            >
              <div className="flex items-center gap-4 mb-3">
                <section.icon className="w-8 h-8 text-accent flex-shrink-0" />
                <h2 className="text-2xl font-bold text-text-on-ui group-hover:text-accent transition-colors">
                  {section.name}
                </h2>
              </div>
              <p className="text-text-muted">{section.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}