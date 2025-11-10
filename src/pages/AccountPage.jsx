import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext'; // 1. Import
import { User, ClipboardList, Users, LogOut } from 'lucide-react';

export default function AccountPage() {
  const { signOut } = useAuth();
  const { t } = useLanguage(); // 2. Initialize

  const handleSignOut = () => {
    console.log('Sign Out button clicked, attempting to call signOut function...');
    signOut();
  };

  // 3. Translate navLinks
  const navLinks = [
    { name: t('profile_settings'), path: '/account/profile', icon: User },
    { name: t('my_submissions'), path: '/account/submissions', icon: ClipboardList },
    { name: t('manage_friends'), path: '/account/friends', icon: Users },
  ];

  return (
    <div className="text-text-primary max-w-6xl mx-auto py-8 px-4"> {/* THEMED */}
      <h1 className="text-4xl font-bold mb-8">{t('my_account')}</h1> {/* THEMED & Translated */}
      
      <div className="md:grid md:grid-cols-4 gap-8">
        <aside className="md:col-span-1 mb-8 md:mb-0">
          <nav className="space-y-2">
            {navLinks.map((link) => (
              <NavLink
                key={link.name}
                to={link.path}
                className={({ isActive }) => 
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-lg ${
                    isActive ? 'bg-accent text-text-on-ui font-bold' : 'text-text-primary hover:bg-primary-bg' // THEMED
                  }`
                }
              >
                <link.icon className="w-6 h-6" />
                <span>{link.name}</span>
              </NavLink>
            ))}
            
            <div className="pt-4 mt-4 border-t border-primary-bg"> {/* THEMED */}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-lg text-red-400 hover:bg-red-500/20"
                aria-label={t('sign_out')}
              >
                <LogOut className="w-6 h-6" />
                <span>{t('sign_out')}</span> {/* Translated */}
              </button>
            </div>
          </nav>
        </aside>

        <main className="md:col-span-3">
          {/* This Outlet renders the child pages (ProfileSettingsPage, etc.) */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}