import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { List, Hammer, BookMarked, Users, Database, Code, ShieldCheck } from 'lucide-react';
import logo from '../assets/dashrank-logo.webp';

// Feature Card Component
const FeatureCard = ({ icon: Icon, title, children }) => (
  <div className="bg-ui-bg/50 backdrop-blur-sm p-6 rounded-xl border border-primary-bg shadow-lg">
    <Icon className="w-10 h-10 text-accent mb-4" />
    <h3 className="text-2xl font-bold text-text-on-ui mb-2">{title}</h3>
    <p className="text-text-muted">{children}</p>
  </div>
);

// Main Landing Page
export default function LandingPage() {
  const { t } = useLanguage();
  const [isLoaded, setIsLoaded] = useState(false);

  // This is the key to your request:
  // It forces the dark theme ("cyan") when this page loads.
  // The `return` function is a cleanup: it RESTORES the user's
  // saved theme when they navigate away from this page.
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "cyan";
    document.documentElement.setAttribute('data-theme', 'cyan');
    setIsLoaded(true); // Trigger fade-in animation

    return () => {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  const sections = [
    { name: t('main_list'), path: '/main', icon: List, desc: t('landing_card_main_desc', { defaultValue: 'The official ranked list of top demons.' }) },
    { name: t('creators_workshop'), path: '/layouts', icon: Hammer, desc: t('landing_card_workshop_desc', { defaultValue: 'Collaborate, find decorators, and share layouts.' }) },
    { name: t('progression_tracker'), path: '/progression', icon: BookMarked, desc: t('landing_card_progression_desc', { defaultValue: 'Log your demon completions and track your progress.' }) },
    { name: t('top_players'), path: '/players', icon: Users, desc: t('landing_card_players_desc', { defaultValue: 'See who is at the top of the leaderboard.' }) }
  ];

  return (
    <div className={`bg-primary-bg text-text-primary transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
      {/* Hero Section */}
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-8 overflow-hidden">
        <img src={logo} alt="DashRank Logo" className="w-32 h-32 mx-auto mb-6" />
        <h1 className="font-poppins text-7xl font-bold text-accent mb-4">
          DashRank
        </h1>
        <p className="text-2xl text-text-muted mb-12 max-w-2xl">
          {t('landing_page_subtitle')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
          {sections.map((section, index) => (
            <Link
              key={section.path}
              to={section.path}
              className="block p-6 bg-ui-bg border border-primary-bg rounded-xl shadow-lg hover:border-accent hover:-translate-y-1 transition-all duration-300 group"
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center gap-4 mb-3">
                <section.icon className="w-8 h-8 text-accent flex-shrink-0 transition-transform duration-300 group-hover:scale-110" />
                <h2 className="text-2xl font-bold text-text-on-ui group-hover:text-accent transition-colors">
                  {section.name}
                </h2>
              </div>
              <p className="text-text-muted">{section.desc}</p>
            </Link>
          ))}
        </div>
        <div className="mt-16 text-text-muted animate-pulse">
          {t('scroll_down_for_more', { defaultValue: 'Scroll down for more info' })}
        </div>
      </div>

      {/* About Section */}
      <div className="py-24 bg-ui-bg border-y border-primary-bg">
        <div className="max-w-4xl mx-auto px-8 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl font-bold text-text-on-ui mb-4">{t('info_about_title')}</h2>
            <p className="text-lg text-text-muted">
              {t('info_about_desc')}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <FeatureCard icon={List} title={t('landing_feature_lists_title', { defaultValue: 'All Lists, One Place' })}>
              {t('landing_feature_lists_desc', { defaultValue: 'Access the Main, Unrated, Platformer, and Challenge lists without changing sites.' })}
            </FeatureCard>
            <FeatureCard icon={Hammer} title={t('landing_feature_workshop_title', { defaultValue: 'Creator\'s Workshop' })}>
              {t('landing_feature_workshop_desc', { defaultValue: 'Find collaborators for your layouts and manage your decoration team.' })}
            </FeatureCard>
          </div>
        </div>
      </div>
      
      {/* API Section */}
      <div className="py-24 bg-primary-bg">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <Database className="w-16 h-16 text-accent mx-auto mb-6" />
          <h2 className="text-4xl font-bold text-text-primary mb-4">{t('info_api_title')}</h2>
          <p className="text-lg text-text-muted mb-8 max-w-2xl mx-auto">
            {t('info_api_desc')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div className="bg-ui-bg p-4 rounded-lg border border-primary-bg">
              <h3 className="font-semibold text-text-on-ui mb-2">{t('info_api_list_title')}</h3>
              <code className="block bg-primary-bg text-text-muted p-2 rounded font-mono text-sm">
                GET /api/lists/:listType
              </code>
            </div>
            <div className="bg-ui-bg p-4 rounded-lg border border-primary-bg">
              <h3 className="font-semibold text-text-on-ui mb-2">{t('info_api_level_title')}</h3>
              <code className="block bg-primary-bg text-text-muted p-2 rounded font-mono text-sm">
                GET /api/level/:levelId
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-8 border-t border-primary-bg">
        <p className="text-text-muted">DashRank v1.0.0 - {t('not_affiliated_robtop', { defaultValue: 'Not affiliated with RobTop Games AB.' })}</p>
      </footer>
    </div>
  );
}