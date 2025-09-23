// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError('');
    setIsSubmitting(true);

    const result = await login(identifier, password);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.message);
    }
    
    setIsSubmitting(false);
  };

  return (
    <div className="flex justify-center items-center min-h-screen p-4">
      <div className="w-full max-w-md">
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-lg px-8 pt-6 pb-8">
          <h2 className="text-3xl font-bold mb-6 text-center text-gray-900 dark:text-gray-100">Login</h2>
          {error && (
            <div className="bg-red-100 dark:bg-red-500/20 border border-red-400 dark:border-red-500 text-red-700 dark:text-red-300 px-4 py-3 rounded-md mb-4 text-center">
              {error}
            </div>
          )}
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="identifier">
              Username or Email
            </label>
            <input
              type="text"
              id="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="shadow-sm appearance-none border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded w-full py-2 px-3 text-gray-900 dark:text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
              disabled={isSubmitting}
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2" htmlFor="password">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="shadow-sm appearance-none border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded w-full py-2 px-3 text-gray-900 dark:text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
              disabled={isSubmitting}
            />
          </div>
          <div className="flex items-center justify-center">
            <button 
              type="submit" 
              className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-800 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-colors duration-200"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Logging In...' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}