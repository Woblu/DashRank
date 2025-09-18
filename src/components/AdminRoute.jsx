// src/components/AdminRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

const ROLES = ['ADMIN', 'MODERATOR'];

export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Or a loading spinner
  }

  if (!user || !ROLES.includes(user.role)) {
    // Redirect non-admins to the home page
    return <Navigate to="/" replace />;
  }

  return children;
}