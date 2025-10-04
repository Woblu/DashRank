import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import LevelDetail from "./pages/LevelDetail";
import PlayerProfile from "./pages/PlayerProfile";
import PlayerList from "./components/PlayerList";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./components/RegisterPage.jsx";
import Tabs from "./components/Tabs";
import sideDeco from "./assets/c9b562fc33dfe9e93230abab38e1ef32.webp";
import { LanguageProvider } from "./contexts/LanguageContext.jsx";
import ReloadPrompt from "./components/ReloadPrompt";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import AccountPage from "./pages/AccountPage";
import ProfileSettingsPage from './pages/account/ProfileSettingsPage';
import SubmissionPage from './pages/account/SubmissionPage';
import AdminDashboard from './pages/AdminDashboard';
import PersonalRecordDetail from './pages/PersonalRecordDetail';
import UserProfile from './pages/UserProfile';
import FriendsPage from './pages/account/FriendsPage';
import CreateLayoutPage from './pages/layouts/CreateLayoutPage';
import LayoutGalleryPage from './pages/layouts/LayoutGalleryPage';
import LayoutDetailPage from './pages/layouts/LayoutDetailPage';
import AdminReportsPage from './pages/AdminReportsPage';
import GuidelinesPage from './pages/GuidelinesPage'; // Import the new page

export default function App() {
  return (
    <LanguageProvider>
      <div className="relative min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col overflow-x-hidden">
        <div 
          className="hidden lg:block absolute left-0 top-0 h-full w-32 xl:w-48 opacity-20 z-10"
          style={{ backgroundImage: `url(${sideDeco})`, backgroundRepeat: "repeat-y", backgroundPosition: "0px -1.5rem", transform: "scaleX(-1)" }}
        ></div>
        
        <Tabs />

        <main className="flex-grow p-4 w-full max-w-7xl mx-auto z-20">
          <Routes>
            {/* Main public lists */}
            <Route path="/" element={<Navigate to="/main" replace />} />
            <Route path="/:listType" element={<Home />} />
            <Route path="/level/:listType/:levelId" element={<LevelDetail />} />                
            <Route path="/players" element={<PlayerList />} />
            <Route path="/players/:playerName" element={<PlayerProfile />} />
            <Route path="/guidelines" element={<GuidelinesPage />} /> {/* Add the new route */}
            
            {/* User-specific routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/progression" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/progression/:recordId" element={<ProtectedRoute><PersonalRecordDetail /></ProtectedRoute>} />
            <Route path="/u/:username" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
            
            {/* Creator's Hub Routes */}
            <Route path="/layouts" element={<LayoutGalleryPage />} />
            <Route path="/layouts/new" element={<ProtectedRoute><CreateLayoutPage /></ProtectedRoute>} />
            <Route path="/layouts/:layoutId" element={<LayoutDetailPage />} />

            <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>}>
              <Route index element={<Navigate to="profile" replace />} />
              <Route path="profile" element={<ProfileSettingsPage />} />
              <Route path="submissions" element={<SubmissionPage />} />
              <Route path="friends" element={<FriendsPage />} />
            </Route>

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>}>
              <Route index element={<div className="text-white text-center"><h1>Welcome to the Admin Dashboard!</h1><p>Select a section to manage.</p></div>} />
              <Route path="reports" element={<AdminReportsPage />} />
            </Route>

          </Routes>
        </main>

        <div 
          className="hidden lg:block absolute right-0 top-0 h-full w-32 xl:w-48 opacity-20 z-10"
          style={{ backgroundImage: `url(${sideDeco})`, backgroundRepeat: "repeat-y", backgroundPosition: "0px -1.5rem" }}
        ></div>
        
        <ReloadPrompt />
      </div>
    </LanguageProvider>
  );
}