// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
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
import SubmissionPage from './pages-account/SubmissionPage';
import MyProgressPage from './pages/account/MyProgressPage';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  return (
    <LanguageProvider>
      <Router>
        <div className="relative min-h-screen bg-gray-900 flex flex-col overflow-x-hidden">
          <div 
            className="hidden lg:block absolute left-0 top-0 h-full w-32 xl:w-48 opacity-20 z-10"
            style={{ backgroundImage: `url(${sideDeco})`, backgroundRepeat: "repeat-y", backgroundPosition: "0px -1.5rem", transform: "scaleX(-1)" }}
          ></div>
          
          <Tabs />

          <main className="flex-grow p-4 w-full max-w-7xl mx-auto z-20">
            <Routes>
              {/* Main Routes */}
              <Route path="/" element={<Navigate to="/main" replace />} />
              <Route path="/:listType" element={<Home />} />
              <Route path="/level/:listType/:levelId" element={<LevelDetail />} />                
              <Route path="/players" element={<PlayerList />} />
              <Route path="/players/:playerName" element={<PlayerProfile />} />
              
              {/* Auth, Admin, and Account Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>}>
                <Route index element={<Navigate to="profile" replace />} />
                <Route path="profile" element={<ProfileSettingsPage />} />
                <Route path="submissions" element={<SubmissionPage />} />
                <Route path="progress" element={<MyProgressPage />} />
              </Route>
              <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            </Routes>
          </main>

          <div 
            className="hidden lg:block absolute right-0 top-0 h-full w-32 xl:w-48 opacity-20 z-10"
            style={{ backgroundImage: `url(${sideDeco})`, backgroundRepeat: "repeat-y", backgroundPosition: "0px -1.5rem" }}
          ></div>
          
          <ReloadPrompt />
        </div>
      </Router>
    </LanguageProvider>
  );
}