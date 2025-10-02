import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User, ClipboardList, Users, LogOut } from 'lucide-react';

export default function AccountPage() {
  const { signOut } = useAuth();

  const handleSignOut = () => {
    console.log('Sign Out button clicked, attempting to call signOut function...');
    signOut();
  };

  const navLinks = [
    { name: 'Profile Settings', path: '/account/profile', icon: User },
    { name: 'My Submissions', path: '/account/submissions', icon: ClipboardList },
    { name: 'Manage Friends', path: '/account/friends', icon: Users },
  ];

  return (
    <div className="text-white max-w-6xl mx-auto py-8 px-4">
      <h1 className="text-4xl font-bold mb-8">My Account</h1>
      <div className="md:grid md:grid-cols-4 gap-8">
        <aside className="md:col-span-1 mb-8 md:mb-0">
          <nav className="space-y-2">
            {navLinks.map((link) => (
              <NavLink
                key={link.name}
                to={link.path}
                className={({ isActive }) => 
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-lg ${
                    isActive ? 'bg-cyan-500 text-white font-bold' : 'hover:bg-gray-800'
                  }`
                }
              >
                <link.icon className="w-6 h-6" />
                <span>{link.name}</span>
              </NavLink>
            ))}
            
            <div className="pt-4 mt-4 border-t border-gray-700">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-lg text-red-400 hover:bg-red-500/20"
              >
                <LogOut className="w-6 h-6" />
                <span>Sign Out</span>
              </button>
            </div>
          </nav>
        </aside>

        <main className="md:col-span-3">
          <Outlet />
        </main>
      </div>
    </div>
  );
}