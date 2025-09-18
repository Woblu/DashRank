// src/pages/AccountPage.jsx
import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { User, ClipboardList } from 'lucide-react';

export default function AccountPage() {
  const navLinks = [
    { name: 'Profile Settings', path: '/account/profile', icon: User },
    { name: 'My Submissions', path: '/account/submissions', icon: ClipboardList }
  ];

  return (
    <div className="text-white max-w-6xl mx-auto py-8 px-4">
      <h1 className="text-4xl font-bold mb-8">My Account</h1>
      <div className="md:grid md:grid-cols-4 gap-8">
        {/* Sidebar Navigation */}
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
          </nav>
        </aside>

        {/* Page Content */}
        <main className="md:col-span-3">
          <Outlet /> {/* Child routes will render here */}
        </main>
      </div>
    </div>
  );
}