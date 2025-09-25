import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);
    try {
      await axios.post('/api/auth', {
        action: 'register', // Specify the action for the consolidated endpoint
        email,
        username,
        password,
      });
      setSuccess('Registration successful! Please log in.');
      setTimeout(() => navigate('/login'), 2000); // Redirect to login after 2 seconds
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-full py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-gray-800 p-10 rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">
            Create a new account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full appearance-none rounded-none rounded-t-md border border-gray-700 bg-gray-900 px-3 py-2 text-white placeholder-gray-500 focus:z-10 focus:border-cyan-500 focus:outline-none focus:ring-cyan-500 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label htmlFor="username" className="sr-only">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="relative block w-full appearance-none rounded-none border border-gray-700 bg-gray-900 px-3 py-2 text-white placeholder-gray-500 focus:z-10 focus:border-cyan-500 focus:outline-none focus:ring-cyan-500 sm:text-sm"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="relative block w-full appearance-none rounded-none rounded-b-md border border-gray-700 bg-gray-900 px-3 py-2 text-white placeholder-gray-500 focus:z-10 focus:border-cyan-500 focus:outline-none focus:ring-cyan-500 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-center text-sm">{error}</p>}
          {success && <p className="text-green-400 text-center text-sm">{success}</p>}

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-cyan-600 py-2 px-4 text-sm font-medium text-white hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:bg-cyan-800 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating account...' : 'Create Account'}
            </button>
          </div>
        </form>
        <p className="mt-2 text-center text-sm text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-cyan-400 hover:text-cyan-300">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}